import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, TestClient } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

const PASSWORD = "SuperSecret123456";

beforeEach(async () => {
  await resetTestDb();
});

async function adminClient() {
  const admin = await createTestUser({ role: "admin", password: PASSWORD });
  return { admin, client: await loginAs(admin.email, PASSWORD) };
}

describe("PATCH /api/team — ficha de persona", () => {
  it("un admin edita nombre, teléfono, cargo y fecha de ingreso de otra persona", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker" });

    const res = await client.patch("/api/team", {
      id: member.id,
      name: "Nuevo Nombre",
      phone: "+57 300 222 3333",
      jobTitle: "Media Buyer",
      hireDate: "2025-01-10",
    });
    expect(res.status).toBe(200);

    const row = await query("SELECT name, phone, job_title, hire_date::text AS hire_date FROM users WHERE id = $1;", [member.id]);
    expect(row.rows[0]).toEqual({ name: "Nuevo Nombre", phone: "+57 300 222 3333", job_title: "Media Buyer", hire_date: "2025-01-10" });
  });

  it("cambiar el correo cierra las sesiones de esa persona", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker", password: PASSWORD });
    const memberClient = await loginAs(member.email, PASSWORD);
    expect((await memberClient.get("/api/account/profile")).status).toBe(200);

    const res = await client.patch("/api/team", { id: member.id, email: "otro-correo@test.local" });
    expect(res.status).toBe(200);

    // La caché de resolveSession() es por proceso y de 15s; la fila ya está
    // revocada en la base, que es lo que se verifica acá.
    const active = await query("SELECT 1 FROM sessions WHERE user_id = $1 AND revoked_at IS NULL;", [member.id]);
    expect(active.rows).toHaveLength(0);
  });

  it("un correo ya usado por otra cuenta da 409, no 500", async () => {
    const { admin, client } = await adminClient();
    const member = await createTestUser({ role: "traffiker" });

    const res = await client.patch("/api/team", { id: member.id, email: admin.email });
    expect(res.status).toBe(409);
  });

  it("valida el formato de los campos nuevos", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker" });

    expect((await client.patch("/api/team", { id: member.id, email: "no-es-correo" })).status).toBe(400);
    expect((await client.patch("/api/team", { id: member.id, hireDate: "2999-01-01" })).status).toBe(400);
    expect((await client.patch("/api/team", { id: member.id, phone: "xx" })).status).toBe(400);
    expect((await client.patch("/api/team", { id: member.id, name: "A" })).status).toBe(400);
  });

  it("un sales_manager (sin team:write) recibe 403", async () => {
    const manager = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const member = await createTestUser({ role: "traffiker" });
    const client = await loginAs(manager.email, PASSWORD);

    expect((await client.patch("/api/team", { id: member.id, name: "Hackeado" })).status).toBe(403);
  });

  it("audita el cambio como team.update", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker" });
    await client.patch("/api/team", { id: member.id, jobTitle: "Lead" });

    const audit = await query("SELECT 1 FROM audit_log WHERE action = 'team.update' AND entity_id = $1;", [String(member.id)]);
    expect(audit.rows).toHaveLength(1);
  });
});

describe("DELETE /api/team/[id]/sessions", () => {
  it("un admin cierra todas las sesiones de otra persona sin desactivarla", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker", password: PASSWORD });
    await loginAs(member.email, PASSWORD);
    await loginAs(member.email, PASSWORD);

    const res = await client.delete(`/api/team/${member.id}/sessions`);
    expect(res.status).toBe(200);
    expect((await res.json()).revoked).toBe(2);

    const status = await query("SELECT status FROM users WHERE id = $1;", [member.id]);
    expect(status.rows[0].status).toBe("active");
    // Puede volver a entrar con su contraseña.
    await expect(loginAs(member.email, PASSWORD)).resolves.toBeDefined();
  });

  it("no se permite sobre uno mismo (para eso está Mi Cuenta)", async () => {
    const { admin, client } = await adminClient();
    expect((await client.delete(`/api/team/${admin.id}/sessions`)).status).toBe(400);
  });

  it("un sales_manager recibe 403", async () => {
    const manager = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const member = await createTestUser({ role: "traffiker" });
    const client = await loginAs(manager.email, PASSWORD);
    expect((await client.delete(`/api/team/${member.id}/sessions`)).status).toBe(403);
  });

  it("404 si la persona no existe", async () => {
    const { client } = await adminClient();
    expect((await client.delete("/api/team/999999/sessions")).status).toBe(404);
  });
});

describe("/dashboard/equipo/[id]", () => {
  it("un admin ve la ficha de una persona del equipo", async () => {
    const { client } = await adminClient();
    const member = await createTestUser({ role: "traffiker", name: "Persona Visible" });

    const res = await client.get(`/dashboard/equipo/${member.id}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Persona Visible");
  });

  it("una cuenta de cliente da 404 en la ficha del equipo", async () => {
    const { client } = await adminClient();
    const portalUser = await createTestUser({ role: "client" });
    expect((await client.get(`/dashboard/equipo/${portalUser.id}`)).status).toBe(404);
  });

  it("un sales_manager es redirigido fuera de la ficha", async () => {
    const manager = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const member = await createTestUser({ role: "traffiker" });
    const client = await loginAs(manager.email, PASSWORD);

    const res = await client.get(`/dashboard/equipo/${member.id}`);
    expect(res.status).toBe(307);
  });

  it("sin sesión, el proxy manda a /login", async () => {
    const member = await createTestUser({ role: "traffiker" });
    const res = await new TestClient().get(`/dashboard/equipo/${member.id}`);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
