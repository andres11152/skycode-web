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
      avatarUrl: null,
    });
  });

  it("expone la variante chica del avatar para el header", async () => {
    const user = await createTestUser();
    await query(
      `UPDATE users SET avatar_variants = $1 WHERE id = $2;`,
      [JSON.stringify({ sm: "https://cdn.test/a-sm.webp", md: "https://cdn.test/a-md.webp", lg: "https://cdn.test/a-lg.webp" }), user.id]
    );
    const session = await createTestSession(user.id);

    const resolved = await resolveSession(session.id);
    expect(resolved?.avatarUrl).toBe("https://cdn.test/a-sm.webp");
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

describe("resolveSession — expiración por inactividad", () => {
  const HOURS = 60 * 60 * 1000;

  it("rechaza una sesión que lleva más de 12 h sin usarse, aunque no haya expirado ni esté revocada", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id, { lastSeenAt: new Date(Date.now() - 13 * HOURS) });

    expect(await resolveSession(session.id)).toBeNull();
  });

  it("acepta una sesión usada hace menos de 12 h", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id, { lastSeenAt: new Date(Date.now() - 11 * HOURS) });

    expect(await resolveSession(session.id)).not.toBeNull();
  });

  it("renueva last_seen_at cuando la marca está vieja (>5 min)", async () => {
    const user = await createTestUser();
    const staleAt = new Date(Date.now() - 2 * HOURS);
    const session = await createTestSession(user.id, { lastSeenAt: staleAt });

    await resolveSession(session.id);

    const row = await query("SELECT last_seen_at FROM sessions WHERE id = $1;", [session.id]);
    expect(new Date(row.rows[0].last_seen_at).getTime()).toBeGreaterThan(staleAt.getTime() + HOURS);
  });

  it("NO escribe en la base si la marca es reciente (una escritura por request sería un UPDATE por cada carga)", async () => {
    const user = await createTestUser();
    const recent = new Date(Date.now() - 60 * 1000);
    const session = await createTestSession(user.id, { lastSeenAt: recent });

    await resolveSession(session.id);

    const row = await query("SELECT last_seen_at FROM sessions WHERE id = $1;", [session.id]);
    expect(new Date(row.rows[0].last_seen_at).getTime()).toBe(recent.getTime());
  });
});
