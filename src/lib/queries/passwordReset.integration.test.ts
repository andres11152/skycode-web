import { beforeEach, describe, expect, it } from "vitest";
import { createPasswordResetToken, findValidResetToken, consumeResetToken } from "./passwordReset";
import { query, withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createPasswordResetToken / findValidResetToken", () => {
  it("un token recién creado es válido", async () => {
    const user = await createTestUser();
    await createPasswordResetToken({
      id: crypto.randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await query(`SELECT id FROM password_resets WHERE user_id = $1;`, [user.id]);
    const found = await findValidResetToken(String(res.rows[0].id));

    expect(found).not.toBeNull();
    expect(found!.userId).toBe(user.id);
  });

  it("un token expirado no es válido", async () => {
    const user = await createTestUser();
    const id = crypto.randomUUID();
    await createPasswordResetToken({ id, userId: user.id, expiresAt: new Date(Date.now() - 1000) });

    expect(await findValidResetToken(id)).toBeNull();
  });

  it("un token ya usado no es válido", async () => {
    const user = await createTestUser();
    const id = crypto.randomUUID();
    await createPasswordResetToken({ id, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await query(`UPDATE password_resets SET used_at = now() WHERE id = $1;`, [id]);

    expect(await findValidResetToken(id)).toBeNull();
  });

  it("un token que no existe devuelve null", async () => {
    expect(await findValidResetToken(crypto.randomUUID())).toBeNull();
  });
});

describe("consumeResetToken", () => {
  it("marca el token usado, rota el hash y revoca las sesiones activas", async () => {
    const user = await createTestUser();
    const id = crypto.randomUUID();
    await createPasswordResetToken({ id, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3);`, [
      crypto.randomUUID(),
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ]);

    await withTransaction((client) =>
      consumeResetToken({ token: id, userId: user.id, passwordHash: "nuevo-hash-falso" }, client)
    );

    const tokenRow = await query(`SELECT used_at FROM password_resets WHERE id = $1;`, [id]);
    expect(tokenRow.rows[0].used_at).not.toBeNull();

    const userRow = await query(`SELECT password_hash FROM users WHERE id = $1;`, [user.id]);
    expect(userRow.rows[0].password_hash).toBe("nuevo-hash-falso");

    const sessionsRow = await query(`SELECT revoked_at FROM sessions WHERE user_id = $1;`, [user.id]);
    expect(sessionsRow.rows.every((r) => r.revoked_at !== null)).toBe(true);

    // El propio token ya no debe servir para un segundo canje.
    expect(await findValidResetToken(id)).toBeNull();
  });
});
