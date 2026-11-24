import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs, uniqueSuffix } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const PASSWORD = "SuperSecret123456";

describe("Crear cliente → invitarlo al portal → activa su cuenta y ve solo lo suyo", () => {
  it("flujo completo", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const adminClient = await loginAs(admin.email, PASSWORD);
    const email = `cliente-${uniqueSuffix()}@test.local`;

    const created = await adminClient.post("/api/clients", { name: "Racing Bike", email, company: "Racing Bike SAS" });
    expect(created.status).toBe(201);
    const { client } = await created.json();

    // El mismo correo no se puede crear dos veces.
    expect((await adminClient.post("/api/clients", { name: "Otro", email })).status).toBe(409);

    const invite = await adminClient.post(`/api/clients/${client.id}/portal-invite`, {});
    expect(invite.status).toBe(200);
    const { inviteUrl } = await invite.json();
    const token = inviteUrl.split("/invitar/")[1];

    const portalUser = new TestClient();
    const accept = await portalUser.post("/api/team/accept", { token, name: "Dueño Racing", password: "ContraseñaSegura123456" });
    expect(accept.status).toBe(200);

    const me = await (await portalUser.get("/api/auth/me")).json();
    expect(me.user.role).toBe("client");
    expect(me.user.email).toBe(email);

    // Un cliente no entra al panel interno ni a la lista de clientes.
    expect((await portalUser.get("/api/clients")).status).toBe(403);

    // Ya tiene cuenta: no se le puede invitar otra vez.
    expect((await adminClient.post(`/api/clients/${client.id}/portal-invite`, {})).status).toBe(409);
  });

  it("un cliente (o un rol sin clients:write) no puede crear clientes ni invitar", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: PASSWORD });
    const t = await loginAs(traffiker.email, PASSWORD);
    expect((await t.post("/api/clients", { name: "X", email: `x-${uniqueSuffix()}@test.local` })).status).toBe(403);
    expect((await t.post("/api/clients/1/portal-invite", {})).status).toBe(403);
  });

  it("un cliente inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const a = await loginAs(admin.email, PASSWORD);
    expect((await a.post("/api/clients/999999/portal-invite", {})).status).toBe(404);
  });
});
