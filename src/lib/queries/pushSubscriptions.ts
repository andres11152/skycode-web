import { query } from "../db";

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Guarda o reemplaza una suscripción por su `endpoint` (la clave real de
 * unicidad, ver migración 0031) — un `ON CONFLICT` en vez de un INSERT
 * simple porque volver a suscribirse desde el mismo navegador (ej. tras
 * limpiar el service worker) reutiliza el mismo endpoint; y si ese
 * endpoint termina asociado a otro usuario (dispositivo compartido, sesión
 * distinta en el mismo navegador), la suscripción se reasigna al dueño más
 * reciente en vez de fallar por duplicado.
 */
export async function saveSubscription(userId: number | string, sub: PushSubscriptionData): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth;`,
    [userId, sub.endpoint, sub.p256dh, sub.auth]
  );
}

/** `WHERE user_id = $1` es la única barrera contra borrar la suscripción de otra persona — mismo criterio que `revokeOwnSession()`. */
export async function deleteSubscription(userId: number | string, endpoint: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2;`, [userId, endpoint]);
}

/** Sin chequeo de dueño — para cuando el propio navegador (vía `sendPushToUser`) confirma que un endpoint ya no es válido (404/410) y hay que limpiarlo, sin conocer todavía a quién pertenecía. */
export async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE endpoint = $1;`, [endpoint]);
}

export async function getSubscriptionsForUser(userId: number | string): Promise<PushSubscriptionData[]> {
  const res = await query(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1;`, [userId]);
  return res.rows.map((row) => ({
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
  }));
}

export async function hasAnyPushSubscription(userId: number | string): Promise<boolean> {
  const res = await query(`SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1;`, [userId]);
  return res.rows.length > 0;
}
