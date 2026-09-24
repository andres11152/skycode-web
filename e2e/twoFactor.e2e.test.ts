import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { confirmTotpSetup, startTotpSetup } from "../src/lib/queries/totp";
import { generateTotpCode } from "../src/lib/totp";

beforeEach(async () => {
  await resetTestDb();
});

/** Prepara un usuario con 2FA ya activado, saltándose la UI (ver
 * totp.integration.test.ts para esa capa) — acá el foco es el flujo HTTP
 * de login en dos pasos, no cómo se configura 2FA. */
async function createUserWithTotp() {
  const user = await createTestUser({ password: "SuperSecret123456" });
  const { secret } = await startTotpSetup(user.id);
  const { backupCodes } = await confirmTotpSetup(user.id, generateTotpCode(secret));
  return { user, secret, backupCodes: backupCodes! };
}

describe("Login con 2FA activo — POST /api/auth/login + POST /api/auth/login/verify-2fa", () => {
  it("la contraseña correcta con 2FA activo NO deja entrar de una — pide needsTwoFactor, sin cookie de sesión", async () => {
    const { user } = await createUserWithTotp();
    const client = new TestClient();

    const res = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.needsTwoFactor).toBe(true);
    expect(typeof body.pendingToken).toBe("string");
    expect(client.hasCookie("skycode_session")).toBe(false);
  });

  it("flujo completo: password -> pendingToken -> código TOTP correcto -> sesión real", async () => {
    const { user, secret } = await createUserWithTotp();
    const client = new TestClient();

    const loginRes = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const { pendingToken } = await loginRes.json();

    const verifyRes = await client.post("/api/auth/login/verify-2fa", { pendingToken, code: generateTotpCode(secret) });
    expect(verifyRes.status).toBe(200);

    const verifyBody = await verifyRes.json();
    expect(verifyBody.user).toMatchObject({ id: user.id, email: user.email });
    expect(client.hasCookie("skycode_session")).toBe(true);
  });

  it("un código de respaldo también funciona en el segundo paso, y se consume", async () => {
    const { user, backupCodes } = await createUserWithTotp();
    const client = new TestClient();

    const loginRes = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const { pendingToken } = await loginRes.json();

    const verifyRes = await client.post("/api/auth/login/verify-2fa", { pendingToken, code: backupCodes[0] });
    expect(verifyRes.status).toBe(200);
    expect(client.hasCookie("skycode_session")).toBe(true);

    // El mismo código de respaldo ya no sirve para un segundo login.
    const client2 = new TestClient();
    const loginRes2 = await client2.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const { pendingToken: pendingToken2 } = await loginRes2.json();
    const verifyRes2 = await client2.post("/api/auth/login/verify-2fa", { pendingToken: pendingToken2, code: backupCodes[0] });
    expect(verifyRes2.status).toBe(401);
  });

  it("código incorrecto: 401, sin sesión", async () => {
    const { user } = await createUserWithTotp();
    const client = new TestClient();

    const loginRes = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const { pendingToken } = await loginRes.json();

    const verifyRes = await client.post("/api/auth/login/verify-2fa", { pendingToken, code: "000000" });
    expect(verifyRes.status).toBe(401);
    expect(client.hasCookie("skycode_session")).toBe(false);
  });

  it("un pendingToken inventado/de otra sesión no sirve para entrar", async () => {
    const { secret } = await createUserWithTotp();
    const client = new TestClient();

    const res = await client.post("/api/auth/login/verify-2fa", {
      pendingToken: "token-que-no-existe",
      code: generateTotpCode(secret),
    });
    expect(res.status).toBe(401);
  });

  it("un usuario SIN 2FA sigue entrando directo, sin paso intermedio (no se rompió el login normal)", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const client = new TestClient();

    const res = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const body = await res.json();

    expect(body.needsTwoFactor).toBeUndefined();
    expect(client.hasCookie("skycode_session")).toBe(true);
  });
});

describe("Autogestión de 2FA — POST /api/auth/2fa/*", () => {
  it("setup + confirm activa 2FA para la sesión actual", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const client = await loginAs(user.email, "SuperSecret123456");

    const setupRes = await client.post("/api/auth/2fa/setup");
    expect(setupRes.status).toBe(200);
    const { secret, qrCodeDataUrl } = await setupRes.json();
    expect(typeof secret).toBe("string");
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const confirmRes = await client.post("/api/auth/2fa/confirm", { code: generateTotpCode(secret) });
    expect(confirmRes.status).toBe(200);
    const { backupCodes } = await confirmRes.json();
    expect(backupCodes).toHaveLength(8);
  });

  it("confirmar con un código equivocado no activa nada", async () => {
    const user = await createTestUser({ password: "SuperSecret123456" });
    const client = await loginAs(user.email, "SuperSecret123456");

    await client.post("/api/auth/2fa/setup");
    const confirmRes = await client.post("/api/auth/2fa/confirm", { code: "000000" });
    expect(confirmRes.status).toBe(400);
  });

  it("disable exige un código válido — sin él, 2FA se queda activo", async () => {
    const { user, secret } = await createUserWithTotp();
    // `loginAs` no sirve acá: este usuario YA tiene 2FA activo, así que
    // `/api/auth/login` por sí solo no deja una sesión real (devuelve
    // needsTwoFactor, sin cookie) — hay que completar el segundo paso a mano.
    const client = new TestClient();
    const loginRes = await client.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const { pendingToken } = await loginRes.json();
    await client.post("/api/auth/login/verify-2fa", { pendingToken, code: generateTotpCode(secret) });

    const badRes = await client.post("/api/auth/2fa/disable", { code: "000000" });
    expect(badRes.status).toBe(400);

    const goodRes = await client.post("/api/auth/2fa/disable", { code: generateTotpCode(secret) });
    expect(goodRes.status).toBe(200);

    // Ahora un login con esa cuenta ya no debería pedir 2FA.
    const client2 = new TestClient();
    const secondLoginRes = await client2.post("/api/auth/login", { email: user.email, password: "SuperSecret123456" });
    const body = await secondLoginRes.json();
    expect(body.needsTwoFactor).toBeUndefined();
  });

  it("no se puede configurar 2FA sin sesión (401)", async () => {
    const client = new TestClient();
    const res = await client.post("/api/auth/2fa/setup");
    expect(res.status).toBe(401);
  });
});
