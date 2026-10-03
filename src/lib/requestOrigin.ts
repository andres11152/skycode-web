// Sin dependencias de Node (pg, bcrypt) a propósito: lo importa proxy.ts, que
// corre en Edge Runtime.

type HeaderReader = { get(name: string): string | null };

/**
 * ¿El header `Origin` apunta a este mismo host? Solo se compara el HOST, nunca
 * el esquema — bug real detectado en producción (Render): el edge termina TLS
 * y reenvía al proceso Node por HTTP plano, así que el esquema visto por la
 * app puede ser "http:" aunque el navegador mande `Origin: https://…`. El
 * origen de un atacante cross-site tiene un HOST distinto sin importar el
 * esquema, así que esto no debilita la defensa. `x-forwarded-host` (el que el
 * navegador pidió de verdad) tiene prioridad sobre `host` (que tras un proxy
 * puede ser el nombre interno del servicio).
 */
export function originMatchesHost(headers: HeaderReader): boolean {
  const origin = headers.get("origin");
  const requestHost = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !requestHost) return false;

  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

/**
 * Política estricta para las rutas que aceptan credenciales (login, 2FA,
 * recuperación, invitaciones). A diferencia del criterio general de
 * proxy.ts —que acepta una petición SIN `Origin` para no romper cron jobs,
 * webhooks ni tests server-to-server—, estas rutas solo las llama el
 * navegador desde este mismo sitio, así que se exige evidencia positiva de
 * que la petición es same-origin:
 *   - `Origin` presente y con nuestro host, o
 *   - `Sec-Fetch-Site: same-origin` (el navegador lo pone y JS no puede
 *     falsificarlo; lo mandan todos los navegadores modernos).
 * Una petición `cross-site`/`same-site` de otro origen, o sin ninguna de las
 * dos señales (un script suelto, curl), se rechaza.
 */
export function isSameOriginAuthRequest(headers: HeaderReader): boolean {
  if (headers.get("origin")) return originMatchesHost(headers);
  return headers.get("sec-fetch-site") === "same-origin";
}
