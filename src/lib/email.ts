import { Resend } from "resend";
import { logError } from "./logger";

/**
 * Envoltorio delgado sobre Resend para el cron de notificaciones (ver
 * app/api/cron/check-notifications/route.ts) — incluye el mismo patrón
 * "sin RESEND_API_KEY configurada, solo loguea en consola" ya usado en
 * forgot-password/team/invite/proposals, pero no lo reemplaza ahí: esos
 * cuatro sitios tienen su propia copia inline desde antes de este módulo,
 * y tocarlos no es parte de esta tarea. Este helper es nuevo exclusivamente
 * para no repetir una quinta copia del mismo chequeo en notificaciones.
 */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");

  if (isDummyKey) {
    console.warn(`⚠️ [Email] RESEND_API_KEY no configurada. Correo no enviado a ${to}: "${subject}"`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";
    const { error } = await resend.emails.send({ from: fromAddress, to, subject, text });

    // El SDK de Resend NO lanza excepción cuando la API responde con error:
    // devuelve `{ data, error }`. Antes solo existía el try/catch de abajo,
    // así que un 403 (ej. dominio sin verificar) pasaba como envío exitoso y
    // el correo nunca salía, sin dejar rastro. El catch sigue ahí para
    // fallos de red reales, que esos sí lanzan.
    if (error) {
      logError("⚠️ [Email Send Warning] Resend devolvió un error", error, { to, subject });
    }
  } catch (error) {
    logError("⚠️ [Email Send Warning]", error, { to, subject });
  }
}
