import { query } from "./db";
import type { UserSession } from "./session";

interface CacheEntry {
  session: UserSession;
  expiresAtMs: number;
}

// Amortigua la consulta a PostgreSQL cuando llegan varios requests del mismo
// usuario en pocos segundos (ej. el dashboard cargando /api/auth/me,
// /api/leads y /api/projects casi al mismo tiempo). TTL corto a propósito:
// una revocación o un cambio de rol tarda como máximo esto en reflejarse.
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, CacheEntry>();

/**
 * Resuelve un id de sesión contra la base de datos: confirma que no esté
 * revocada, no haya expirado y el usuario siga activo, y devuelve su rol
 * *actual* — nunca uno capturado en el pasado. Esta consulta (no el JWT) es
 * la verdad de autorización del sistema.
 */
export async function resolveSession(sessionId: string): Promise<UserSession | null> {
  const cached = cache.get(sessionId);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.session;
  }

  const res = await query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.client_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now();`,
    [sessionId]
  );

  const row = res.rows[0];
  if (!row || row.status !== "active") {
    cache.delete(sessionId);
    return null;
  }

  const session: UserSession = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    clientId: row.client_id,
  };
  cache.set(sessionId, { session, expiresAtMs: Date.now() + CACHE_TTL_MS });
  return session;
}

/**
 * Se llama al revocar una sesión (logout) para que el propio proceso que
 * acaba de cerrarla no siga sirviéndola desde caché los próximos segundos.
 */
export function invalidateSessionCache(sessionId: string): void {
  cache.delete(sessionId);
}
