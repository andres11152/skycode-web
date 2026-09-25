import { gzipSync, gunzipSync } from "node:zlib";
import { query } from "./db";
import { uploadBackupObject, listBackupKeys, deleteBackupObject } from "./backupStorage";

// Cuántos backups semanales se conservan en R2 antes de empezar a borrar
// los más viejos — 8 semanas (~2 meses) cubre bien un desastre sin
// acumular espacio indefinidamente. Render ya guarda sus propios backups
// nativos con retención propia (ver CLAUDE.md "Backups") — este es un
// respaldo adicional fuera de Render, no el principal.
const RETENTION_COUNT = 8;

/**
 * Dump lógico completo de la base — TODAS las tablas de `public` (incluida
 * `schema_migrations`, para que restaurar deje claro qué migraciones ya
 * corrieron), cada una como `SELECT * FROM tabla`. Deliberadamente NO es
 * un `pg_dump` real: el runtime de Node en Render no trae el binario
 * `pg_dump` instalado (es un entorno de aplicación, no de administración
 * de base de datos), así que un dump lógico armado con el mismo cliente
 * `pg` que ya usa el resto del proyecto es la opción sin dependencias
 * nuevas. No reconstruye DDL (tipos de columna, constraints, índices) — en
 * un desastre real, la restauración parte de correr las migraciones desde
 * cero (`scripts/migrate.mjs`, ya versionadas en el repo) y solo usa este
 * dump para reinsertar los DATOS.
 */
export async function generateDatabaseBackupBuffer(): Promise<Buffer> {
  const tablesRes = await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`);
  const tableNames = tablesRes.rows.map((row) => String(row.tablename));

  const tables: Record<string, unknown[]> = {};
  for (const tableName of tableNames) {
    // Nombre de tabla viene de `pg_tables` (catálogo del sistema, nunca de
    // input externo) — interpolarlo acá no es una inyección SQL, es la
    // única forma de parametrizar un identificador de tabla en Postgres.
    const rowsRes = await query(`SELECT * FROM "${tableName}";`);
    tables[tableName] = rowsRes.rows;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    tables,
  };

  return gzipSync(Buffer.from(JSON.stringify(payload)));
}

export function parseDatabaseBackupBuffer(gzipped: Buffer): { generatedAt: string; tables: Record<string, Record<string, unknown>[]> } {
  return JSON.parse(gunzipSync(gzipped).toString("utf-8"));
}

function backupKeyForDate(date: Date): string {
  return `backup-${date.toISOString().slice(0, 10)}.json.gz`;
}

/**
 * Genera el backup de hoy, lo sube a R2, y borra los más viejos que
 * excedan `RETENTION_COUNT` — todo en una sola llamada porque el cron
 * semanal solo necesita "que exista el de hoy y no se acumulen más de N".
 * Sobrescribe sin problema si ya existe uno con la fecha de hoy (mismo
 * `Key`, `PutObjectCommand` reemplaza) — correr el cron dos veces el mismo
 * día no duplica nada.
 */
export async function runWeeklyDatabaseBackup(): Promise<{ key: string; sizeBytes: number; deletedKeys: string[] }> {
  const buffer = await generateDatabaseBackupBuffer();
  const key = backupKeyForDate(new Date());
  await uploadBackupObject(key, buffer);

  const existingKeys = await listBackupKeys();
  const keysToDelete = existingKeys.length > RETENTION_COUNT ? existingKeys.slice(0, existingKeys.length - RETENTION_COUNT) : [];
  for (const oldKey of keysToDelete) {
    await deleteBackupObject(oldKey);
  }

  return { key, sizeBytes: buffer.length, deletedKeys: keysToDelete };
}
