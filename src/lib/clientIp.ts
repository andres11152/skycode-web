// Sin dependencias de Node (pg, bcrypt) a propósito: lo importa proxy.ts, que
// corre en Edge Runtime (mismo criterio que lib/session.ts).

// Cuántos proxies de confianza hay delante de esta app (el edge del hosting
// — Vercel/Render — cuenta como uno). Cada proxy de confianza *añade* al
// final de X-Forwarded-For la IP que él mismo observó directamente; todo lo
// que venga antes de esa posición lo puede escribir el propio cliente en su
// request original, así que tomar la entrada más a la izquierda (como hacía
// este archivo antes) dejaba que cualquiera evadiera los rate limiters del
// sistema mandando `X-Forwarded-For: <valor aleatorio>` en cada intento.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

// Si la app queda detrás de Cloudflare (recomendado para absorber DDoS
// volumétrico, ver docs/auth-hardening.md), la IP real del visitante llega en
// `CF-Connecting-IP`, puesta por Cloudflare — NO se puede confiar en ella si
// el tráfico puede llegar a Render sin pasar por Cloudflare (cualquiera la
// falsificaría), así que solo se lee con `TRUST_CLOUDFLARE=true`, que se
// activa cuando el origen ya está restringido a las IPs de Cloudflare.
const TRUST_CLOUDFLARE = process.env.TRUST_CLOUDFLARE === "true";

export function getClientIp(request: Request): string {
  if (TRUST_CLOUDFLARE) {
    const cfIp = request.headers.get("cf-connecting-ip")?.trim();
    if (cfIp) return cfIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean);
    const trustedIndex = ips.length - TRUSTED_PROXY_HOPS;
    if (ips[trustedIndex]) return ips[trustedIndex];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
