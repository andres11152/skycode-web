import { query } from "../db";

export interface UserAuthRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  totp_enabled: boolean;
}

/**
 * Busca un usuario activo o deshabilitado por email.
 */
export async function findUserByEmail(email: string): Promise<UserAuthRow | null> {
  const res = await query(
    "SELECT id, name, email, password_hash, role, status, totp_enabled FROM users WHERE email = $1 LIMIT 1;",
    [email.toLowerCase()]
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    password_hash: String(row.password_hash ?? ""),
    role: String(row.role ?? ""),
    status: String(row.status ?? ""),
    totp_enabled: Boolean(row.totp_enabled),
  };
}

export interface CreateSessionRecordParams {
  id: string;
  userId: number;
  expiresAt: Date;
  ip: string;
  userAgent?: string | null;
}

/**
 * Registra una sesión activa en la base de datos PostgreSQL.
 */
export async function createSessionRecord({ id, userId, expiresAt, ip, userAgent }: CreateSessionRecordParams) {
  await query(
    `INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5);`,
    [id, userId, expiresAt, ip, userAgent || null]
  );
}

export interface RevokedSessionInfo {
  userId: number;
  email: string;
}

/**
 * Desactiva/revoca una sesión activa.
 */
export async function revokeSessionRecord(sessionId: string): Promise<RevokedSessionInfo | null> {
  const res = await query(
    `UPDATE sessions s SET revoked_at = now()
     FROM users u
     WHERE s.id = $1 AND s.user_id = u.id AND s.revoked_at IS NULL
     RETURNING s.user_id AS user_id, u.email AS email;`,
    [sessionId]
  );

  const row = res.rows[0];
  if (!row) return null;

  return {
    userId: Number(row.user_id),
    email: String(row.email ?? ""),
  };
}
