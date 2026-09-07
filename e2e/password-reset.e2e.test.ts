import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createTestUser, createTestSession, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

/**
 * `RESEND_API_KEY` no está configurada en .env.test (a propósito, ver
 * docker-compose.test.yml) — el endpoint nunca envía el correo real ni lo
 * devuelve en la respuesta HTTP (sería una fuga de account-takeover, ver
 * app/api/auth/forgot-password/route.ts). El único lugar donde el test
 * puede ver el token es la propia base de datos, igual que lo vería el
 * link dentro de un correo real.
 */
async function latestResetTokenFor(email: string): Promise<string> {
  const res = await query(
    `SELECT pr.id FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE u.email = $1
     ORDER BY pr.created_at DESC LIMIT 1;`,
    [email.toLowerCase()]
  );
  if (!res.rows[0]) throw new Error(`No se creó un token de reseteo para ${email}`);
  return String(res.rows[0].id);
}

describe("Recuperación de contraseña", () => {
  it("pedir el reseteo crea un token y responde el mensaje genérico", async () => {
    const user = await createTestUser({ email: `reset-${Date.now()}@test.local` });

    const res = await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("Si existe una cuenta");

    const token = await latestResetTokenFor(user.email);
    expect(token).toBeTruthy();
  });

  it("responde EXACTAMENTE el mismo mensaje para un correo que no existe — no revela si la cuenta existe", async () => {
    const existingUser = await createTestUser({ email: `si-existe-${Date.now()}@test.local` });

    const resExisting = await new TestClient().post("/api/auth/forgot-password", { email: existingUser.email });
    const resMissing = await new TestClient().post("/api/auth/forgot-password", {
      email: `no-existe-${Date.now()}@test.local`,
    });

    expect(resExisting.status).toBe(resMissing.status);
    const [bodyExisting, bodyMissing] = await Promise.all([resExisting.json(), resMissing.json()]);
    expect(bodyExisting.message).toBe(bodyMissing.message);
  });

  it("el token nunca viaja en la respuesta HTTP", async () => {
    const user = await createTestUser({ email: `no-leak-${Date.now()}@test.local` });
    const res = await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const raw = JSON.stringify(await res.clone().json());

    const token = await latestResetTokenFor(user.email);
    expect(raw).not.toContain(token);
  });

  it("un token válido permite fijar una nueva contraseña y deja logueado de una vez", async () => {
    const user = await createTestUser({ email: `flujo-completo-${Date.now()}@test.local` });
    await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const token = await latestResetTokenFor(user.email);

    const client = new TestClient();
    const res = await client.post("/api/auth/reset-password", {
      token,
      password: "NuevaContraseñaSegura123",
    });
    expect(res.status).toBe(200);
    expect(client.hasCookie("skycode_session")).toBe(true);

    const meRes = await client.get("/api/auth/me");
    const me = await meRes.json();
    expect(me.authenticated).toBe(true);
    expect(me.user.email).toBe(user.email.toLowerCase());
  });

  it("resetear la contraseña revoca las sesiones activas previas", async () => {
    const user = await createTestUser({ email: `revoca-sesiones-${Date.now()}@test.local` });
    const oldSession = await createTestSession(user.id);

    await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const token = await latestResetTokenFor(user.email);
    await new TestClient().post("/api/auth/reset-password", { token, password: "OtraContraseñaSegura123" });

    const sessionRes = await query(`SELECT revoked_at FROM sessions WHERE id = $1;`, [oldSession.id]);
    expect(sessionRes.rows[0].revoked_at).not.toBeNull();
  });

  it("la contraseña vieja deja de servir para iniciar sesión después del reset", async () => {
    const user = await createTestUser({ email: `vieja-invalida-${Date.now()}@test.local`, password: "ContraseñaVieja123456" });
    await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const token = await latestResetTokenFor(user.email);
    await new TestClient().post("/api/auth/reset-password", { token, password: "ContraseñaNueva123456" });

    await expect(loginAs(user.email, "ContraseñaVieja123456")).rejects.toThrow();
    await expect(loginAs(user.email, "ContraseñaNueva123456")).resolves.toBeInstanceOf(TestClient);
  });

  it("un token ya usado no se puede volver a canjear", async () => {
    const user = await createTestUser({ email: `un-solo-uso-${Date.now()}@test.local` });
    await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const token = await latestResetTokenFor(user.email);

    await new TestClient().post("/api/auth/reset-password", { token, password: "PrimeraVezSegura123" });
    const secondAttempt = await new TestClient().post("/api/auth/reset-password", {
      token,
      password: "SegundaVezSegura1234",
    });
    expect(secondAttempt.status).toBe(400);
  });

  it("un token que no existe da 400", async () => {
    const res = await new TestClient().post("/api/auth/reset-password", {
      token: "00000000-0000-0000-0000-000000000000",
      password: "ContraseñaSegura123456",
    });
    expect(res.status).toBe(400);
  });

  it("una contraseña corta (menos de 12 caracteres) es rechazada", async () => {
    const user = await createTestUser({ email: `corta-${Date.now()}@test.local` });
    await new TestClient().post("/api/auth/forgot-password", { email: user.email });
    const token = await latestResetTokenFor(user.email);

    const res = await new TestClient().post("/api/auth/reset-password", { token, password: "corta" });
    expect(res.status).toBe(400);
  });
});
