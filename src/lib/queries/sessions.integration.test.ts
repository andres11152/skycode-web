import { beforeEach, describe, expect, it } from "vitest";
import { getActiveUserSessions, revokeOwnSession } from "./sessions";
import { createTestUser, createTestSession, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getActiveUserSessions", () => {
  it("devuelve solo las sesiones activas del usuario, no las de otros ni las expiradas/revocadas", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();

    const active = await createTestSession(user.id);
    await createTestSession(user.id, { expiresAt: new Date(Date.now() - 1000) }); // expirada
    await createTestSession(user.id, { revokedAt: new Date() }); // revocada
    await createTestSession(otherUser.id); // de otro usuario

    const sessions = await getActiveUserSessions(user.id);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(active.id);
  });
});

describe("revokeOwnSession", () => {
  it("revoca una sesión propia y deja de aparecer como activa", async () => {
    const user = await createTestUser();
    const session = await createTestSession(user.id);

    const revoked = await revokeOwnSession(session.id, user.id);
    expect(revoked).toBe(true);

    const remaining = await getActiveUserSessions(user.id);
    expect(remaining).toHaveLength(0);
  });

  it("no revoca la sesión de otro usuario — devuelve false y no la toca", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const session = await createTestSession(owner.id);

    const revoked = await revokeOwnSession(session.id, attacker.id);
    expect(revoked).toBe(false);

    const stillActive = await getActiveUserSessions(owner.id);
    expect(stillActive).toHaveLength(1);
  });

  it("devuelve false para un sessionId que no existe", async () => {
    const user = await createTestUser();
    const revoked = await revokeOwnSession(crypto.randomUUID(), user.id);
    expect(revoked).toBe(false);
  });
});
