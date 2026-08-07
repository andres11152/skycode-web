import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs, uniqueSuffix } from "./helpers/client";
import { createTestClient, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

function tokenFromInviteUrl(inviteUrl: string): string {
  return inviteUrl.split("/invitar/")[1];
}

describe("Invitación de equipo → aceptar → login automático → redirección por rol", () => {
  it("un admin invita, la persona activa su cuenta y queda con sesión iniciada en un solo paso", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const inviteeEmail = `nuevo-vendedor-${uniqueSuffix()}@test.local`;

    const inviteRes = await adminClient.post("/api/team/invite", {
      email: inviteeEmail,
      role: "sales_manager",
    });
    expect(inviteRes.status).toBe(200);
    const { inviteUrl } = await inviteRes.json();
    const token = tokenFromInviteUrl(inviteUrl);

    const inviteeClient = new TestClient();
    const acceptRes = await inviteeClient.post("/api/team/accept", {
      token,
      name: "Vendedor Nuevo",
      password: "ContraseñaSegura123456",
    });
    expect(acceptRes.status).toBe(200);
    expect(inviteeClient.hasCookie("skycode_session")).toBe(true);

    const meRes = await inviteeClient.get("/api/auth/me");
    const me = await meRes.json();
    expect(me.authenticated).toBe(true);
    expect(me.user.role).toBe("sales_manager");
    expect(me.user.email).toBe(inviteeEmail);
  });

  it("un token ya usado no se puede volver a canjear", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const inviteRes = await adminClient.post("/api/team/invite", {
      email: `usar-una-vez-${uniqueSuffix()}@test.local`,
      role: "traffiker",
    });
    const { inviteUrl } = await inviteRes.json();
    const token = tokenFromInviteUrl(inviteUrl);

    await new TestClient().post("/api/team/accept", { token, name: "A", password: "ContraseñaSegura123456" });

    const secondAttempt = await new TestClient().post("/api/team/accept", {
      token,
      name: "B",
      password: "OtraContraseñaSegura123",
    });
    expect(secondAttempt.status).toBe(400);
  });

  it("un token que no existe da 400 al intentar aceptarlo", async () => {
    const res = await new TestClient().post("/api/team/accept", {
      token: "00000000-0000-0000-0000-000000000000",
      name: "Nadie",
      password: "ContraseñaSegura123456",
    });
    expect(res.status).toBe(400);
  });

  it("no se puede invitar a un correo que ya tiene cuenta", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const existing = await createTestUser({ role: "traffiker" });

    const res = await adminClient.post("/api/team/invite", { email: existing.email, role: "sales_manager" });
    expect(res.status).toBe(400);
  });

  it("no se puede invitar con rol 'client' — eso es acceso de portal, no de equipo interno", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/team/invite", {
      email: `deberia-fallar-${uniqueSuffix()}@test.local`,
      role: "client",
    });
    expect(res.status).toBe(400);
  });

  it("una contraseña corta (menos de 12 caracteres) es rechazada al aceptar la invitación", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const inviteRes = await adminClient.post("/api/team/invite", {
      email: `contrasena-corta-${uniqueSuffix()}@test.local`,
      role: "traffiker",
    });
    const { inviteUrl } = await inviteRes.json();
    const token = tokenFromInviteUrl(inviteUrl);

    const res = await new TestClient().post("/api/team/accept", { token, name: "X", password: "corta" });
    expect(res.status).toBe(400);
  });

  describe("redirección por rol al visitar /dashboard vs /portal", () => {
    it("un cliente que visita /dashboard es redirigido a /portal", async () => {
      const testClient = await createTestClient();
      const clientUser = await createTestUser({ role: "client", clientId: testClient.id, password: "SuperSecret123456" });
      const browserClient = await loginAs(clientUser.email, "SuperSecret123456");

      const res = await browserClient.get("/dashboard");
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/portal");
    });

    it("un miembro del equipo (sales_manager) que visita /portal es redirigido a /dashboard", async () => {
      const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
      const browserClient = await loginAs(salesManager.email, "SuperSecret123456");

      const res = await browserClient.get("/portal");
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard");
    });

    it("un miembro del equipo entra normalmente a /dashboard (sin redirección)", async () => {
      const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
      const browserClient = await loginAs(admin.email, "SuperSecret123456");

      const res = await browserClient.get("/dashboard");
      expect(res.status).toBe(200);
    });

    it("una visita sin sesión a /dashboard redirige a /login", async () => {
      const anonymous = new TestClient();
      const res = await anonymous.get("/dashboard");
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });
  });
});
