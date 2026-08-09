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

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweepAtMs = Date.now();

/**
 * Borra entradas vencidas del cache. El TTL corto (15s) evita servir un rol
 * obsoleto, pero por sí solo no libera memoria: una sesión resuelta una sola
 * vez y nunca vuelta a consultar quedaba con su entrada residente en el Map
 * para siempre (su `expiresAtMs` pasado la vuelve inservible, pero nada la
 * borraba). Con sesiones de 7 días de vida y tráfico sostenido, eso crece
 * sin límite. Barrido perezoso disparado desde `resolveSession()` como
 * mucho una vez por intervalo (no `setInterval`, para no mantener vivo el
 * event loop en un runtime serverless).
 */
function sweepExpiredEntries(now: number) {
  if (now - lastSweepAtMs < SWEEP_INTERVAL_MS) return;
  lastSweepAtMs = now;

  for (const [sessionId, entry] of cache) {
    if (entry.expiresAtMs <= now) cache.delete(sessionId);
  }
}

/**
 * Resuelve un id de sesión contra la base de datos: confirma que no esté
 * revocada, no haya expirado y el usuario siga activo, y devuelve su rol
 * *actual* — nunca uno capturado en el pasado. Esta consulta (no el JWT) es
 * la verdad de autorización del sistema.
 */
export async function resolveSession(sessionId: string): Promise<UserSession | null> {
  const now = Date.now();
  sweepExpiredEntries(now);

  const cached = cache.get(sessionId);
  if (cached && cached.expiresAtMs > now) {
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
