import { beforeEach, describe, expect, it } from "vitest";
import { generateDatabaseBackupBuffer, parseDatabaseBackupBuffer } from "./databaseBackup";
import { query, withTransaction } from "./db";
import { restoreTables } from "../../scripts/lib/restoreTables.mjs";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "./testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("restoreTables — ida y vuelta backup → restore", () => {
  it("restaura JSONB con arrays, respeta FKs y deja las secuencias listas para insertar", async () => {
    const user = await createTestUser();
    const client = await createTestClient({ name: "Cliente Restore" });
    await createTestProject(client.id);
    await query(
      `INSERT INTO proposal_templates (name, items, created_by) VALUES ('Plantilla', $1::jsonb, $2);`,
      [JSON.stringify([{ description: "Ítem", quantity: 1, unit_price: 100 }]), user.id]
    );

    const parsed = parseDatabaseBackupBuffer(await generateDatabaseBackupBuffer());

    // Simula un desastre: la base queda sin datos.
    await resetTestDb();

    await withTransaction((c) => restoreTables(c, parsed.tables));

    const restoredClient = await query("SELECT name FROM clients;");
    expect(restoredClient.rows.map((r) => r.name)).toContain("Cliente Restore");
    const templates = await query("SELECT items FROM proposal_templates;");
    expect(templates.rows[0].items).toEqual([{ description: "Ítem", quantity: 1, unit_price: 100 }]);

    // Sin `setval`, este INSERT chocaba con el id ya restaurado.
    const next = await query("INSERT INTO clients (name, email) VALUES ('Nuevo', 'nuevo@test.local') RETURNING id;");
    expect(Number(next.rows[0].id)).toBeGreaterThan(0);
  });
});
