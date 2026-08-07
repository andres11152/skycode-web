import { beforeEach, describe, expect, it } from "vitest";
import { invalidateSessionCache, resolveSession } from "./authSession";
import { query } from "./db";
import { createTestClient, createTestSession, createTestUser, resetTestDb } from "./testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("resolveSession", () => {
  it("resuelve una sesión válida al rol y datos actuales del usuario", async () => {
    const user = await createTestUser({ name: "Ana", role: "sales_manager" });
    const session = await createTestSession(user.id);

    const resolved = await resolveSession(session.id);
    expect(resolved).toEqual({
      id: user.id,
      name: "Ana",
      email: user.email,
      role: "sales_manager",
      clientId: null,
    });
  });

  it("devuelve null para un id de sesión que no existe", async () => {
    const resolved = await resolveSession("00000000-0000-0000-0000-000000000000");
    expect(resolved).toBeNull();
  });

  it("devuelve null para una sesión revocada", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id, { revokedAt: new Date() });

    const resolved = await resolveSession(session.id);
    expect(resolved).toBeNull();
  });

  it("devuelve null para una sesión expirada", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id, { expiresAt: new Date(Date.now() - 1000) });

    const resolved = await resolveSession(session.id);
    expect(resolved).toBeNull();
  });

  it("devuelve null si el usuario fue desactivado, aunque la sesión siga vigente", async () => {
    const user = await createTestUser({ status: "disabled" });
    const session = await createTestSession(user.id);

    const resolved = await resolveSession(session.id);
    expect(resolved).toBeNull();
  });

  it("expone el rol *actual* del usuario, no uno capturado en el pasado", async () => {
    const user = await createTestUser({ role: "traffiker" });
    const session = await createTestSession(user.id);

    const first = await resolveSession(session.id);
    expect(first?.role).toBe("traffiker");

    invalidateSessionCache(session.id); // fuerza a saltarse la caché para ver el cambio
    await query(`UPDATE users SET role = 'admin' WHERE id = $1;`, [user.id]);

    const second = await resolveSession(session.id);
    expect(second?.role).toBe("admin");
  });

  it("cachea el resultado: una revocación en BD no se refleja hasta invalidar la caché", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id);

    const first = await resolveSession(session.id);
    expect(first).not.toBeNull();

    // Revoca directo en BD, sin pasar por invalidateSessionCache — simula
    // otro proceso revocando la sesión mientras esta instancia sigue con
    // la caché tibia (ventana de hasta CACHE_TTL_MS).
    await query(`UPDATE sessions SET revoked_at = now() WHERE id = $1;`, [session.id]);

    const stillCached = await resolveSession(session.id);
    expect(stillCached).not.toBeNull(); // todavía sirve el valor en caché

    invalidateSessionCache(session.id);
    const afterInvalidate = await resolveSession(session.id);
    expect(afterInvalidate).toBeNull();
  });

  it("incluye clientId para usuarios de tipo cliente", async () => {
    const client = await createTestClient();
    const user = await createTestUser({ role: "client", clientId: client.id });
    const session = await createTestSession(user.id);

    const resolved = await resolveSession(session.id);
    expect(resolved?.clientId).toBe(client.id);
  });
});
