// `web-push` hace un POST HTTPS al endpoint cuando hay una notificación: sin
// lista blanca, cualquier sesión (incluido el rol client) lo apuntaba a un
// host interno (SSRF ciego). Solo los servicios push de los navegadores.
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port !== "") return false;
    return PUSH_HOST_SUFFIXES.some((suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}
