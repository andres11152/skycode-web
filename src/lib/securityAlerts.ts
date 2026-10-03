import { query } from "./db";
import { sendEmail } from "./email";
import { logAudit } from "./audit";
import { logError } from "./logger";
import { createNotification } from "./queries/notifications";

/**
 * Avisos al DUEÑO de la cuenta ante señales de seguridad: un acceso desde un
 * dispositivo nunca visto y una ráfaga de intentos fallidos. Son el último
 * eslabón de la cadena — si el atacante pasa el proof-of-work y los límites,
 * la persona se entera igual (correo + campanita + push, mismo canal triple
 * que las demás notificaciones del sistema).
 *
 * Todo es "mejor esfuerzo": un fallo al avisar nunca debe impedir un login ni
 * ocultar un intento fallido — por eso quien llama usa `void ….catch(logError)`.
 */

const BROWSERS: Array<[RegExp, string]> = [
  [/edg(e|a|ios)?\//i, "Edge"],
  [/opr\/|opera/i, "Opera"],
  [/firefox|fxios/i, "Firefox"],
  [/chrome|crios/i, "Chrome"],
  [/safari/i, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/iphone|ipad|ipod/i, "iOS"],
  [/android/i, "Android"],
  [/windows/i, "Windows"],
  [/mac os x|macintosh/i, "macOS"],
  [/cros/i, "ChromeOS"],
  [/linux/i, "Linux"],
];

/**
 * Familia de dispositivo (navegador + sistema) a partir del User-Agent, sin
 * versiones: una actualización de Chrome no debe disparar "dispositivo
 * nuevo", pero pasar de Chrome/macOS a Firefox/Windows sí. Es heurístico —
 * el UA lo controla el cliente — así que sirve para avisar, nunca para decidir
 * acceso.
 */
export function deviceFamily(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? "Navegador desconocido";
  const system = SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? "sistema desconocido";
  return `${browser} en ${system}`;
}

const KNOWN_DEVICE_LOOKBACK_DAYS = 180;

/**
 * ¿Esta persona entra desde un dispositivo que no se veía en sus últimos 180
 * días? Debe llamarse ANTES de insertar la sesión nueva. Un usuario sin
 * ninguna sesión previa (su primer acceso) NO cuenta como "dispositivo
 * nuevo": avisarle de su propio primer login sería ruido.
 */
export async function detectNewDevice(userId: number, userAgent: string | null | undefined): Promise<boolean> {
  const res = await query(
    `SELECT user_agent FROM sessions
     WHERE user_id = $1 AND created_at > now() - ($2::numeric * interval '1 day')
     ORDER BY created_at DESC LIMIT 100;`,
    [userId, KNOWN_DEVICE_LOOKBACK_DAYS]
  );
  if (res.rows.length === 0) return false;

  const family = deviceFamily(userAgent);
  return !res.rows.some((row) => deviceFamily(row.user_agent as string | null) === family);
}

function formatTime(date: Date): string {
  return date.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" });
}

async function getRecipient(userId: number): Promise<{ email: string; role: string } | null> {
  const res = await query("SELECT email, role FROM users WHERE id = $1 AND status = 'active';", [userId]);
  const row = res.rows[0];
  return row ? { email: String(row.email), role: String(row.role) } : null;
}

function accountLink(role: string): string {
  return role === "client" ? "/portal/cuenta" : "/dashboard/cuenta";
}

export async function notifyNewDeviceLogin(input: { userId: number; ip: string; userAgent: string | null | undefined }): Promise<void> {
  const recipient = await getRecipient(input.userId);
  if (!recipient) return;

  const device = deviceFamily(input.userAgent);
  const when = formatTime(new Date());

  await logAudit(query, {
    actorId: input.userId,
    actorEmail: recipient.email,
    action: "user.new_device_login",
    entityType: "user",
    entityId: input.userId,
    diff: { device },
    ip: input.ip,
  });

  await createNotification({
    userId: input.userId,
    type: "security",
    title: "Nuevo inicio de sesión en tu cuenta",
    body: `Se inició sesión desde ${device} (IP ${input.ip}). Si no fuiste tú, cambia tu contraseña y cierra las demás sesiones.`,
    link: accountLink(recipient.role),
  });

  await sendEmail({
    to: recipient.email,
    subject: "Nuevo inicio de sesión en tu cuenta de SkyCode",
    text: [
      "Hola,",
      "",
      "Detectamos un inicio de sesión en tu cuenta desde un dispositivo que no habíamos visto antes:",
      "",
      `  Dispositivo: ${device}`,
      `  Dirección IP: ${input.ip}`,
      `  Fecha: ${when} (hora de Colombia)`,
      "",
      "Si fuiste tú, no tienes que hacer nada.",
      "",
      "Si NO fuiste tú, entra a tu cuenta, cambia la contraseña y cierra las demás sesiones desde la sección «Mi cuenta». Activar la verificación en dos pasos también ayuda.",
      "",
      "— SkyCode Agency",
    ].join("\n"),
  });
}

/** Cantidad de fallos de un correo (en 15 min) que dispara el aviso al dueño — una sola vez por ventana. */
export const FAILED_LOGIN_ALERT_THRESHOLD = 5;

export async function notifyFailedLoginBurst(input: { userId: number; failures: number; ip: string }): Promise<void> {
  const recipient = await getRecipient(input.userId);
  if (!recipient) return;

  await createNotification({
    userId: input.userId,
    type: "security",
    title: "Intentos fallidos de acceso a tu cuenta",
    body: `Hubo ${input.failures} intentos fallidos de acceso en los últimos 15 minutos. Tu cuenta NO está bloqueada; si no fuiste tú, considera cambiar tu contraseña.`,
    link: accountLink(recipient.role),
  });

  await sendEmail({
    to: recipient.email,
    subject: "Intentos fallidos de acceso a tu cuenta de SkyCode",
    text: [
      "Hola,",
      "",
      `Registramos ${input.failures} intentos fallidos de iniciar sesión en tu cuenta en los últimos 15 minutos (el último, desde la IP ${input.ip}).`,
      "",
      "Tu cuenta no está bloqueada y sigues pudiendo entrar con normalidad. Si fuiste tú equivocándote de contraseña, ignora este mensaje.",
      "",
      "Si NO fuiste tú, alguien podría estar intentando adivinar tu contraseña: te recomendamos cambiarla y activar la verificación en dos pasos desde «Mi cuenta».",
      "",
      "— SkyCode Agency",
    ].join("\n"),
  });
}

/** Atajo para quien llama: ejecuta sin esperar y registra cualquier error (nunca lo propaga). */
export function fireAndLog(label: string, task: Promise<void>): void {
  void task.catch((error) => logError(`⚠️ [SecurityAlert] ${label}`, error));
}
