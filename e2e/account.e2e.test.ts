import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { loginAs, TestClient } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

const PASSWORD = "SuperSecret123456";

beforeEach(async () => {
  await resetTestDb();
});

async function testImageFile(width = 600, height = 400): Promise<File> {
  const buffer = await sharp({ create: { width, height, channels: 3, background: { r: 0, g: 137, b: 205 } } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "foto.png", { type: "image/png" });
}

function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

describe("GET/PATCH /api/account/profile — autogestión", () => {
  it("devuelve el perfil propio sin password_hash ni costo/hora", async () => {
    const user = await createTestUser({ role: "sales_manager", password: PASSWORD, hourlyCost: 99000 });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.get("/api/account/profile");
    expect(res.status).toBe(200);
    const { profile } = await res.json();
    expect(profile.email).toBe(user.email);
    const raw = JSON.stringify(profile);
    expect(raw).not.toContain("password_hash");
    expect(raw).not.toContain("99000");
  });

  it("actualiza el nombre y el teléfono propios", async () => {
    const user = await createTestUser({ role: "traffiker", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.patch("/api/account/profile", { name: "Nombre Nuevo", phone: "+57 300 123 4567" });
    expect(res.status).toBe(200);

    const row = await query("SELECT name, phone FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].name).toBe("Nombre Nuevo");
    expect(row.rows[0].phone).toBe("+57 300 123 4567");
  });

  it("un cliente del portal también puede editar su propio perfil", async () => {
    const user = await createTestUser({ role: "client", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.patch("/api/account/profile", { name: "Cliente Editado" });
    expect(res.status).toBe(200);
  });

  it("rechaza con 400 un `id` inyectado en el body — nunca edita a otra persona", async () => {
    const victim = await createTestUser({ name: "Víctima", password: PASSWORD });
    const attacker = await createTestUser({ role: "traffiker", password: PASSWORD });
    const client = await loginAs(attacker.email, PASSWORD);

    const res = await client.patch("/api/account/profile", { id: victim.id, name: "Hackeado" });
    expect(res.status).toBe(400);

    const row = await query("SELECT name FROM users WHERE id = $1;", [victim.id]);
    expect(row.rows[0].name).toBe("Víctima");
  });

  it("no permite cambiar el propio correo ni el rol por esta vía", async () => {
    const user = await createTestUser({ role: "traffiker", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    expect((await client.patch("/api/account/profile", { email: "otro@test.local" })).status).toBe(400);
    expect((await client.patch("/api/account/profile", { role: "admin" })).status).toBe(400);

    const row = await query("SELECT email, role FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].role).toBe("traffiker");
    expect(row.rows[0].email).toBe(user.email);
  });

  it("valida zona horaria, teléfono y un body vacío", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    expect((await client.patch("/api/account/profile", { timezone: "Marte/Olympus" })).status).toBe(400);
    expect((await client.patch("/api/account/profile", { phone: "abc" })).status).toBe(400);
    expect((await client.patch("/api/account/profile", {})).status).toBe(400);
    expect((await client.patch("/api/account/profile", { timezone: "Europe/Paris" })).status).toBe(200);
  });

  it("el nombre nuevo se refleja de inmediato en la sesión (sin esperar la caché de 15s)", async () => {
    const user = await createTestUser({ name: "Antes", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    await client.get("/api/account/profile"); // calienta la caché de resolveSession
    await client.patch("/api/account/profile", { name: "Después" });

    const me = await client.get("/api/auth/me");
    const data = await me.json();
    expect(data.user.name).toBe("Después");
  });

  it("audita el cambio con solo los campos modificados", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    await client.patch("/api/account/profile", { bio: "Hola" });

    const audit = await query(
      "SELECT diff FROM audit_log WHERE action = 'user.profile_update' AND entity_id = $1;",
      [String(user.id)]
    );
    expect(audit.rows).toHaveLength(1);
    expect(Object.keys(audit.rows[0].diff.after)).toEqual(["bio"]);
  });

  it("sin sesión, 401", async () => {
    expect((await new TestClient().get("/api/account/profile")).status).toBe(401);
    expect((await new TestClient().patch("/api/account/profile", { name: "X" })).status).toBe(401);
  });
});

describe("POST /api/account/password", () => {
  it("con la contraseña actual correcta la cambia, y la nueva sirve para entrar", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.post("/api/account/password", {
      currentPassword: PASSWORD,
      newPassword: "OtraClaveMuyLarga2026",
    });
    expect(res.status).toBe(200);

    await expect(loginAs(user.email, "OtraClaveMuyLarga2026")).resolves.toBeDefined();
  });

  it("revoca las demás sesiones pero deja viva la actual", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const current = await loginAs(user.email, PASSWORD);
    const otherDevice = await loginAs(user.email, PASSWORD);

    await current.post("/api/account/password", { currentPassword: PASSWORD, newPassword: "OtraClaveMuyLarga2026" });

    expect((await current.get("/api/account/profile")).status).toBe(200);
    expect((await otherDevice.get("/api/account/profile")).status).toBe(401);
  });

  it("rechaza una contraseña actual incorrecta y no cambia nada", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.post("/api/account/password", {
      currentPassword: "no-es-esta-clave",
      newPassword: "OtraClaveMuyLarga2026",
    });
    expect(res.status).toBe(400);
    await expect(loginAs(user.email, PASSWORD)).resolves.toBeDefined();

    const audit = await query("SELECT 1 FROM audit_log WHERE action = 'user.password_change_failed';");
    expect(audit.rows).toHaveLength(1);
  });

  it("exige mínimo 12 caracteres y que sea distinta de la actual", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    expect((await client.post("/api/account/password", { currentPassword: PASSWORD, newPassword: "corta" })).status).toBe(400);
    expect((await client.post("/api/account/password", { currentPassword: PASSWORD, newPassword: PASSWORD })).status).toBe(400);
  });

  it("limita los intentos por usuario (5 en 15 min)", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    for (let i = 0; i < 5; i++) {
      await client.post("/api/account/password", { currentPassword: "mala", newPassword: "OtraClaveMuyLarga2026" });
    }
    const res = await client.post("/api/account/password", { currentPassword: PASSWORD, newPassword: "OtraClaveMuyLarga2026" });
    expect(res.status).toBe(429);
  });
});

describe("POST/DELETE /api/account/avatar", () => {
  it("sube una foto real y la expone como 3 variantes cuadradas", async () => {
    const user = await createTestUser({ role: "client", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);

    const res = await client.fetch("/api/account/avatar", { method: "POST", body: fileForm(await testImageFile()) });
    expect(res.status).toBe(200);
    const { avatar } = await res.json();
    expect(avatar.sm).toContain("/avatars/");
    expect(avatar.sm).toContain("-sm.webp");

    const row = await query("SELECT avatar_storage_key FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].avatar_storage_key).toBeTruthy();
  });

  it("un archivo que no es imagen da 400 y no toca la base", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    const fake = new File([new Uint8Array(Buffer.from("no soy una imagen"))], "foto.png", { type: "image/png" });

    const res = await client.fetch("/api/account/avatar", { method: "POST", body: fileForm(fake) });
    expect(res.status).toBe(400);
    const row = await query("SELECT avatar_storage_key FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].avatar_storage_key).toBeNull();
  });

  it("quitar la foto deja el perfil sin avatar", async () => {
    const user = await createTestUser({ password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    await client.fetch("/api/account/avatar", { method: "POST", body: fileForm(await testImageFile()) });

    expect((await client.delete("/api/account/avatar")).status).toBe(200);
    const row = await query("SELECT avatar_storage_key, avatar_variants FROM users WHERE id = $1;", [user.id]);
    expect(row.rows[0].avatar_storage_key).toBeNull();
    expect(row.rows[0].avatar_variants).toBeNull();
  });
});

describe("POST /api/team/[id]/avatar — admin sobre otra persona", () => {
  it("un admin sube la foto de otra persona", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const member = await createTestUser({ role: "traffiker" });
    const client = await loginAs(admin.email, PASSWORD);

    const res = await client.fetch(`/api/team/${member.id}/avatar`, { method: "POST", body: fileForm(await testImageFile()) });
    expect(res.status).toBe(200);
  });

  it("un sales_manager (sin team:write) recibe 403", async () => {
    const manager = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const member = await createTestUser({ role: "traffiker" });
    const client = await loginAs(manager.email, PASSWORD);

    const res = await client.fetch(`/api/team/${member.id}/avatar`, { method: "POST", body: fileForm(await testImageFile()) });
    expect(res.status).toBe(403);
  });

  it("404 si la persona no existe", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const client = await loginAs(admin.email, PASSWORD);

    const res = await client.fetch("/api/team/999999/avatar", { method: "POST", body: fileForm(await testImageFile()) });
    expect(res.status).toBe(404);
  });
});

describe("Páginas de cuenta", () => {
  it("un cliente entra a /portal/cuenta", async () => {
    const user = await createTestUser({ role: "client", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    expect((await client.get("/portal/cuenta")).status).toBe(200);
  });

  it("alguien del equipo que entra a /portal/cuenta va a /dashboard", async () => {
    const user = await createTestUser({ role: "admin", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    const res = await client.get("/portal/cuenta");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("un cliente que entra a /dashboard/cuenta va a su portal", async () => {
    const user = await createTestUser({ role: "client", password: PASSWORD });
    const client = await loginAs(user.email, PASSWORD);
    const res = await client.get("/dashboard/cuenta");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/portal");
  });
});
