import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateDatabaseBackupBuffer, parseDatabaseBackupBuffer, runWeeklyDatabaseBackup } from "./databaseBackup";
import { listBackupKeys, deleteBackupObject, uploadBackupObject } from "./backupStorage";
import { createTestClient, createTestUser, resetTestDb } from "./testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

// Limpia el bucket de backups de prueba entre tests — a diferencia de
// `resetTestDb()` (Postgres), el bucket de R2 de prueba no se reinicia
// solo entre corridas.
afterEach(async () => {
  const keys = await listBackupKeys();
  for (const key of keys) await deleteBackupObject(key);
});

describe("generateDatabaseBackupBuffer / parseDatabaseBackupBuffer", () => {
  it("produce un buffer gzip que se puede volver a parsear a JSON con los datos reales", async () => {
    await createTestClient({ name: "Cliente Backup" });

    const buffer = await generateDatabaseBackupBuffer();
    expect(buffer.length).toBeGreaterThan(0);

    const parsed = parseDatabaseBackupBuffer(buffer);
    expect(parsed.generatedAt).toBeTruthy();
    expect(parsed.tables.clients).toBeDefined();
    expect(parsed.tables.clients.some((row) => row.name === "Cliente Backup")).toBe(true);
  });

  it("incluye tablas vacías también (array vacío, no ausentes)", async () => {
    const buffer = await generateDatabaseBackupBuffer();
    const parsed = parseDatabaseBackupBuffer(buffer);
    // Sin ningún dato creado en este test, leads existe como tabla pero sin filas.
    expect(parsed.tables.leads).toEqual([]);
  });

  it("incluye schema_migrations, para saber qué migraciones ya corrieron al restaurar", async () => {
    const buffer = await generateDatabaseBackupBuffer();
    const parsed = parseDatabaseBackupBuffer(buffer);
    expect(parsed.tables.schema_migrations.length).toBeGreaterThan(0);
  });
});

describe("runWeeklyDatabaseBackup", () => {
  it("sube el backup de hoy al bucket con el nombre esperado", async () => {
    await createTestUser();
    const result = await runWeeklyDatabaseBackup();

    const todayKey = `backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
    expect(result.key).toBe(todayKey);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const keys = await listBackupKeys();
    expect(keys).toContain(todayKey);
  });

  it("no acumula más de 8 backups — borra los más viejos al pasar la retención", async () => {
    // Sube 10 backups "viejos" simulados con nombres de fecha distintos,
    // sin pasar por runWeeklyDatabaseBackup (que siempre usa la fecha de
    // hoy) — simula corridas de semanas anteriores.
    const fakeBuffer = Buffer.from("x");
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, "0");
      await uploadBackupObject(`backup-2026-01-${day}.json.gz`, fakeBuffer);
    }
    expect(await listBackupKeys()).toHaveLength(10);

    await runWeeklyDatabaseBackup();

    const keysAfter = await listBackupKeys();
    // 10 viejos + el de hoy = 11, se podan los 3 más antiguos para dejar 8.
    expect(keysAfter).toHaveLength(8);
    expect(keysAfter).not.toContain("backup-2026-01-01.json.gz");
    expect(keysAfter).not.toContain("backup-2026-01-02.json.gz");
    expect(keysAfter).not.toContain("backup-2026-01-03.json.gz");
  });

  it("correrlo dos veces el mismo día sobrescribe, no duplica", async () => {
    await runWeeklyDatabaseBackup();
    const firstCount = (await listBackupKeys()).length;

    await runWeeklyDatabaseBackup();
    const secondCount = (await listBackupKeys()).length;

    expect(secondCount).toBe(firstCount);
  });
});
