import { query } from "../db";
import type { UserSessionRow } from "@/components/dashboard/types";

/**
 * Sesiones activas (no revocadas, no expiradas) del usuario autenticado —
 * nunca de otro usuario, `userId` siempre viene de `session.id` de la
 * sesión ya resuelta, jamás de un parámetro de request. Para forzar el
 * cierre de sesión de OTRA persona, el camino existente es desactivarla
 * desde `/dashboard/equipo` (`PATCH /api/team`), que revoca todas sus
 * sesiones de una vez — esto es autogestión, no administración ajena.
 */
export async function getActiveUserSessions(userId: number | string): Promise<UserSessionRow[]> {
  const res = await query(
    `SELECT id, created_at, expires_at, ip, user_agent
     FROM sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC;`,
    [userId]
  );

  return res.rows.map((row) => ({
    id: String(row.id),
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    ip: row.ip ? String(row.ip) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
  }));
}

/**
 * Revoca una sesión propia. Devuelve `false` sin tocar nada si el
 * `sessionId` no le pertenece a `userId` — el `WHERE user_id = $2` es la
 * única barrera contra que alguien revoque la sesión de otra persona
 * adivinando o interceptando un UUID ajeno.
 */
export async function revokeOwnSession(sessionId: string, userId: number | string): Promise<boolean> {
  const res = await query(
    `UPDATE sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id;`,
    [sessionId, userId]
  );
  return res.rows.length > 0;
}

/**
 * Revoca todas las sesiones activas de un usuario EXCEPTO la que está
 * usando ahora mismo — llamado al confirmar o desactivar 2FA (ver
 * app/api/auth/2fa/confirm y .../disable). A diferencia de
 * `consumeResetToken`/`disableTotp`-por-team (que revocan TODAS las
 * sesiones, sin excepción, porque ahí se crea una sesión nueva aparte
 * inmediatamente después o la cuenta queda inhabilitada), acá la persona
 * sigue logueada haciendo el cambio desde su propia sesión — revocarla
 * también la dejaría fuera de su propio dashboard justo después de
 * activar el segundo factor que acaba de configurar.
 *
 * Cierra la ventana real que motivó esto: si alguien más (un dispositivo
 * robado, una sesión olvidada en un café internet) tenía sesión abierta
 * con la cuenta, activar o quitar 2FA debe sacarlo de inmediato, no dejarlo
 * con acceso hasta que esa sesión expire por su cuenta (hasta 7 días).
 */
export async function revokeOtherSessions(userId: number | string, currentSessionId: string): Promise<void> {
  await query(
    `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL;`,
    [userId, currentSessionId]
  );
}
