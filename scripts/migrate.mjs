#!/usr/bin/env node
// Uso local:      node --env-file=.env.local scripts/migrate.mjs
// Uso en hosting:  node scripts/migrate.mjs   (las env vars ya están en el entorno)
//
// Aplica en orden los archivos .sql de db/migrations/ que aún no estén
// registrados en la tabla schema_migrations. Cada migración corre dentro de
// su propia transacción: si falla, se revierte y el proceso se detiene sin
// tocar el resto.

import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno. Corre con --env-file=.env.local en desarrollo.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false,
});

const migrationsDir = path.join(import.meta.dirname, "..", "db", "migrations");

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const appliedRes = await pool.query("SELECT id FROM schema_migrations;");
  const applied = new Set(appliedRes.rows.map((r) => r.id));

  let ranAny = false;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1);", [file]);
      await client.query("COMMIT");
      console.log(`✅ Aplicada: ${file}`);
      ranAny = true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`❌ Falló ${file}:`, error.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (!ranAny) console.log("Sin migraciones pendientes.");
} finally {
  await pool.end();
}
