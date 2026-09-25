#!/usr/bin/env node
// Uso: node --env-file=.env.local scripts/restore-database-backup.mjs [clave-del-backup]
//
// Restaura la base de datos desde un backup semanal subido a R2 por
// scripts/../src/app/api/cron/backup-database/route.ts — SOLO para el
// escenario de desastre real (ver "Backups" en CLAUDE.md), no un flujo de
// uso normal. Descarga el objeto, lo descomprime, y REEMPLAZA por
// completo el contenido de cada tabla presente en el dump (TRUNCATE +
// INSERT) dentro de una sola transacción — o todo o nada, nunca una base
// a medio restaurar.
//
// Sin argumento, lista las claves disponibles en el bucket de backups y
// sale sin tocar nada. Con "latest", usa la más reciente. Pide
// confirmación explícita escrita antes de borrar cualquier dato — esto es
// deliberadamente MÁS fricción que un `--force` silencioso, porque el
// costo de un restore accidental (perder todos los datos actuales) es
// altísimo.
//
// No reconstruye el esquema (columnas, constraints, índices) — antes de
// correr esto, la base ya debe tener el esquema al día vía
// `node scripts/migrate.mjs`. Este script solo repone los DATOS.

import { Pool } from "pg";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { gunzipSync } from "node:zlib";
import readline from "node:readline/promises";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local.");
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.R2_BACKUPS_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const bucket = process.env.R2_BACKUPS_BUCKET_NAME;
const accessKeyId = process.env.R2_BACKUPS_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_BACKUPS_SECRET_ACCESS_KEY;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error(
    "Faltan variables de backup (R2_ACCOUNT_ID, R2_BACKUPS_BUCKET_NAME, R2_BACKUPS_ACCESS_KEY_ID, R2_BACKUPS_SECRET_ACCESS_KEY)."
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: Boolean(process.env.R2_BACKUPS_ENDPOINT),
  credentials: { accessKeyId, secretAccessKey },
});

async function listKeys() {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return (res.Contents ?? []).map((obj) => obj.Key).filter(Boolean).sort();
}

const requestedKey = process.argv[2];

if (!requestedKey) {
  const keys = await listKeys();
  console.log("Backups disponibles en R2 (más reciente al final):");
  for (const key of keys) console.log(` - ${key}`);
  console.log("\nUso: node --env-file=.env.local scripts/restore-database-backup.mjs <clave>");
  console.log('     node --env-file=.env.local scripts/restore-database-backup.mjs latest');
  process.exit(0);
}

let key = requestedKey;
if (key === "latest") {
  const keys = await listKeys();
  if (keys.length === 0) {
    console.error("No hay ningún backup en el bucket.");
    process.exit(1);
  }
  key = keys[keys.length - 1];
}

console.log(`Descargando backup: ${key}...`);
const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const gzipped = Buffer.from(await obj.Body.transformToByteArray());
const { generatedAt, tables } = JSON.parse(gunzipSync(gzipped).toString("utf-8"));

const tableNames = Object.keys(tables);
console.log(`\nBackup generado: ${generatedAt}`);
console.log(`Tablas incluidas (${tableNames.length}):`);
for (const name of tableNames) console.log(`  - ${name}: ${tables[name].length} filas`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  '\n⚠️  Esto BORRA todos los datos actuales de la base y los reemplaza por los del backup. Escribe "RESTAURAR" para continuar: '
);
rl.close();

if (answer.trim() !== "RESTAURAR") {
  console.log("Cancelado — no se tocó nada.");
  process.exit(0);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const quotedNames = tableNames.map((name) => `"${name}"`).join(", ");
  console.log("\nVaciando tablas...");
  await client.query(`TRUNCATE TABLE ${quotedNames} RESTART IDENTITY CASCADE;`);

  // Desactiva la validación de FK durante la carga — los datos se insertan
  // en el mismo orden en que vienen en el dump, no en orden de dependencia,
  // así que sin esto una fila hija insertada antes que su padre fallaría.
  await client.query("SET session_replication_role = replica;");

  for (const tableName of tableNames) {
    const rows = tables[tableName];
    if (rows.length === 0) continue;

    console.log(`Restaurando ${tableName} (${rows.length} filas)...`);
    const columns = Object.keys(rows[0]);
    const columnList = columns.map((c) => `"${c}"`).join(", ");

    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      await client.query(`INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders});`, values);
    }
  }

  await client.query("SET session_replication_role = DEFAULT;");
  await client.query("COMMIT");
  console.log("\n✅ Restauración completa.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\n❌ Falló la restauración, se revirtió todo:", error.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
