import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("Bitácora comercial de clientes — RBAC de extremo a extremo", () => {
  it("sales_manager (clients:write) registra una nota y la ve listada con su nombre", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456", name: "Ana Ventas" });
    const client = await createTestClient();
    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");

    const createRes = await salesClient.post(`/api/clients/${client.id}/activities`, {
      body: "Reunión de kickoff agendada para el viernes.",
    });
    expect(createRes.status).toBe(200);
    const { activity } = await createRes.json();
    expect(activity.actor_name).toBe("Ana Ventas");

    const listRes = await salesClient.get(`/api/clients/${client.id}/activities`);
    expect(listRes.status).toBe(200);
    const { activities } = await listRes.json();
    expect(activities).toHaveLength(1);
    expect(activities[0].body).toContain("kickoff");
  });

  it("traffiker sin clients:read no puede ver la bitácora", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const client = await createTestClient();
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await traffikerClient.get(`/api/clients/${client.id}/activities`);
    expect(res.status).toBe(403);
  });

  it("un rol con clients:read pero sin clients:write no puede agregar notas", async () => {
    // client (portal) no tiene ningún permiso de clients:*
    const clientUser = await createTestUser({ role: "client", password: "SuperSecret123456" });
    const client = await createTestClient();
    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");

    const res = await clientBrowser.post(`/api/clients/${client.id}/activities`, { body: "Intento" });
    expect(res.status).toBe(403);
  });

  it("un cuerpo vacío da 400 y no crea nada", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post(`/api/clients/${client.id}/activities`, { body: "   " });
    expect(res.status).toBe(400);

    const row = await query("SELECT COUNT(*) FROM client_activities WHERE client_id = $1;", [client.id]);
    expect(Number(row.rows[0].count)).toBe(0);
  });

  it("un cliente inexistente da 404 al agregar una nota", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/clients/999999/activities", { body: "Nota" });
    expect(res.status).toBe(404);
  });

  it("no se pueden agregar notas a un cliente ya anonimizado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    await query("UPDATE clients SET anonymized_at = now() WHERE id = $1;", [client.id]);
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post(`/api/clients/${client.id}/activities`, { body: "Nota tardía" });
    expect(res.status).toBe(404);
  });
});
