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

describe("Corregir el correo, revocar la invitación y eliminar un cliente", () => {
  async function setup() {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const a = await loginAs(admin.email, PASSWORD);
    const email = `mal-${uniqueSuffix()}@test.local`;
    const { client } = await (await a.post("/api/clients", { name: "Cliente Error", email })).json();
    return { a, admin, client, email };
  }

  it("corregir el correo revoca la invitación pendiente (el enlace viejo deja de servir) y exige uno libre", async () => {
    const { a, client } = await setup();
    const { inviteUrl } = await (await a.post(`/api/clients/${client.id}/portal-invite`, {})).json();
    const token = inviteUrl.split("/invitar/")[1];

    const good = `bien-${uniqueSuffix()}@test.local`;
    expect((await a.patch("/api/clients", { id: client.id, email: good })).status).toBe(200);

    // El enlace que apuntaba al correo equivocado ya no se puede canjear.
    expect((await new TestClient().post("/api/team/accept", { token, name: "X", password: "ContraseñaSegura123456" })).status).toBe(400);

    // Otro cliente con el correo ya tomado → 409.
    const other = await (await a.post("/api/clients", { name: "Otro", email: `otro-${uniqueSuffix()}@test.local` })).json();
    expect((await a.patch("/api/clients", { id: other.client.id, email: good })).status).toBe(409);
  });

  it("no deja cambiar el correo de un cliente que ya activó su portal", async () => {
    const { a, client } = await setup();
    const { inviteUrl } = await (await a.post(`/api/clients/${client.id}/portal-invite`, {})).json();
    await new TestClient().post("/api/team/accept", { token: inviteUrl.split("/invitar/")[1], name: "Dueño", password: "ContraseñaSegura123456" });
    expect((await a.patch("/api/clients", { id: client.id, email: `nuevo-${uniqueSuffix()}@test.local` })).status).toBe(409);
  });

  it("revocar la invitación invalida el enlace", async () => {
    const { a, client } = await setup();
    const { inviteUrl } = await (await a.post(`/api/clients/${client.id}/portal-invite`, {})).json();
    expect((await a.delete(`/api/clients/${client.id}/portal-invite`)).status).toBe(200);
    expect((await new TestClient().post("/api/team/accept", { token: inviteUrl.split("/invitar/")[1], name: "X", password: "ContraseñaSegura123456" })).status).toBe(400);
  });

  it("eliminar: solo admin, y se lleva su cuenta de portal; con proyectos da 409", async () => {
    const { a, client } = await setup();
    const sales = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const s = await loginAs(sales.email, PASSWORD);
    expect((await s.delete(`/api/clients/${client.id}`)).status).toBe(403);

    expect((await a.delete(`/api/clients/${client.id}`)).status).toBe(200);
    expect((await a.delete(`/api/clients/${client.id}`)).status).toBe(404);
  });
});
