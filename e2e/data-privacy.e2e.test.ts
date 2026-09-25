import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, TestClient } from "./helpers/client";
import { query } from "../src/lib/db";
import { createTestClient, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Exportar/anonimizar datos de cliente — RBAC y comportamiento de extremo a extremo", () => {
  it("admin (data_privacy:manage) exporta los datos de un cliente como JSON descargable", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient({ name: "Cliente Exportable", email: "exportable@test.local" });
    await createTestProject(client.id, { title: "Proyecto Exportable" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.get(`/api/clients/${client.id}/export`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain(`cliente-${client.id}-datos.json`);

    const data = await res.json();
    expect(data.client.name).toBe("Cliente Exportable");
    expect(data.projects).toHaveLength(1);

    const auditRes = await query(`SELECT action, entity_id FROM audit_log WHERE action = 'client.export';`);
    expect(auditRes.rows).toHaveLength(1);
    expect(auditRes.rows[0].entity_id).toBe(String(client.id));
  });

  it("un cliente inexistente da 404 al exportar", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.get("/api/clients/999999/export")).status).toBe(404);
  });

  it("sales_manager/traffiker/client NO pueden exportar ni anonimizar (exclusivo de admin)", async () => {
    const client = await createTestClient();
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });

    const salesBrowser = await loginAs(salesManager.email, "SuperSecret123456");
    const traffikerBrowser = await loginAs(traffiker.email, "SuperSecret123456");
    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");

    for (const browser of [salesBrowser, traffikerBrowser, clientBrowser]) {
      expect((await browser.get(`/api/clients/${client.id}/export`)).status).toBe(403);
      expect((await browser.post(`/api/clients/${client.id}/anonymize`, {})).status).toBe(403);
    }
  });

  it("admin anonimiza un cliente y queda registrado en auditoría", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient({ name: "Cliente A Borrar", email: "aborrar@test.local" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post(`/api/clients/${client.id}/anonymize`, {});
    expect(res.status).toBe(200);

    const row = await query(`SELECT name, email, anonymized_at FROM clients WHERE id = $1;`, [client.id]);
    expect(row.rows[0].name).toBe(`Cliente Eliminado #${client.id}`);
    expect(row.rows[0].anonymized_at).not.toBeNull();

    const auditRes = await query(`SELECT action FROM audit_log WHERE action = 'client.anonymize';`);
    expect(auditRes.rows).toHaveLength(1);
  });

  it("anonimizar dos veces el mismo cliente da 409 en el segundo intento", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.post(`/api/clients/${client.id}/anonymize`, {})).status).toBe(200);
    expect((await adminClient.post(`/api/clients/${client.id}/anonymize`, {})).status).toBe(409);
  });

  it("anonimizar un cliente inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.post("/api/clients/999999/anonymize", {})).status).toBe(404);
  });

  it("tras anonimizar, el usuario de portal del cliente ya no puede iniciar sesión", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const portalUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    await adminClient.post(`/api/clients/${client.id}/anonymize`, {});

    const userRow = await query(`SELECT status FROM users WHERE id = $1;`, [portalUser.id]);
    expect(userRow.rows[0].status).toBe("disabled");

    const anonBrowser = new TestClient();
    const loginRes = await anonBrowser.post("/api/auth/login", {
      email: portalUser.email,
      password: "SuperSecret123456",
    });
    expect(loginRes.status).not.toBe(200);
  });
});
