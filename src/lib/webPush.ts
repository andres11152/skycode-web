import webpush, { WebPushError } from "web-push";
import { logError } from "./logger";
import { getSubscriptionsForUser, deleteSubscriptionByEndpoint } from "./queries/pushSubscriptions";

let configured = false;

/**
 * Resuelve perezosamente (no al importar el módulo) — mismo motivo que
 * `lib/storage.ts::getR2Client()`: un `throw`/`setVapidDetails` a nivel de
 * módulo tumbaría `next build` sin que las credenciales hagan falta
 * todavía en esa fase, y este módulo lo importan rutas de API que sí
 * corren en build time (prerender) en otros contextos del proyecto.
 */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

/**
 * Envía una notificación push a TODAS las suscripciones activas de un
 * usuario (puede tener varias — un navegador/dispositivo por suscripción,
 * ver migración 0031). Sin las tres variables VAPID configuradas es un
 * no-op silencioso — mismo criterio que `sendEmail()` sin `RESEND_API_KEY`:
 * la notificación in-app (y el correo, si aplica) ya se guardó/envió por
 * su cuenta en `createNotification()`, esto es un canal adicional, no el
 * único.
 *
 * Un 404/410 del push service significa que el navegador invalidó esa
 * suscripción (usuario revocó el permiso, perfil borrado, etc.) — se borra
 * de una vez en vez de reintentar en cada notificación futura contra un
 * endpoint que nunca va a volver a funcionar. Cualquier otro código de
 * error se loguea pero no interrumpe el resto de suscripciones ni al
 * caller — un push fallido nunca debe tumbar el flujo que generó la
 * notificación real (ej. marcar una factura vencida).
 */
export async function sendPushToUser(userId: number | string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await getSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (error) {
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
          return;
        }
        logError("Error al enviar notificación push", error, { userId });
      }
    })
  );
}
