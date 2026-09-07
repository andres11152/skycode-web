import { query } from "../db";

interface QueryRunner {
  query: typeof query;
}

export async function createPasswordResetToken(
  { id, userId, expiresAt }: { id: string; userId: number | string; expiresAt: Date },
  dbRunner: QueryRunner = { query }
): Promise<void> {
  await dbRunner.query(`INSERT INTO password_resets (id, user_id, expires_at) VALUES ($1, $2, $3);`, [
    id,
    userId,
    expiresAt,
  ]);
}

export interface PasswordResetRow {
  id: string;
  userId: number;
}

/**
 * Busca un token de reseteo válido (no usado y no expirado). No expone si
 * el correo asociado existe — eso lo decide el caller antes de llegar
 * acá (ver `POST /api/auth/forgot-password`, que siempre responde igual
 * exista o no la cuenta).
 */
export async function findValidResetToken(token: string): Promise<PasswordResetRow | null> {
  const res = await query(
    `SELECT id, user_id FROM password_resets WHERE id = $1 AND used_at IS NULL AND expires_at > now();`,
    [token]
  );
  const row = res.rows[0];
  if (!row) return null;

  return { id: String(row.id), userId: Number(row.user_id) };
}

/**
 * Consume el token (transaccional): marca el reseteo usado, rota el hash
 * de contraseña, y revoca todas las sesiones activas del usuario — mismo
 * criterio que desactivar a alguien desde /dashboard/equipo
 * (lib/queries/team.ts). Si alguien más tenía sesión iniciada con la
 * contraseña vieja (ej. un dispositivo robado que motivó el reset), queda
 * afuera de inmediato.
 */
export async function consumeResetToken(
  { token, userId, passwordHash }: { token: string; userId: number; passwordHash: string },
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query(`UPDATE password_resets SET used_at = now() WHERE id = $1;`, [token]);
  await dbRunner.query(`UPDATE users SET password_hash = $1 WHERE id = $2;`, [passwordHash, userId]);
  await dbRunner.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;`, [userId]);
}
