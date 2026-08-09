const buckets = new Map<string, number[]>();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
// Cota superior generosa sobre cualquier `windowMs` real usado en el
// proyecto (hoy el mayor es 10 minutos): una entrada más vieja que esto ya
// expiró para cualquier llamador posible, así que se puede borrar sin
// conocer el windowMs específico que la creó.
const MAX_BUCKET_AGE_MS = 60 * 60 * 1000;
let lastSweepAtMs = Date.now();

/**
 * Borra buckets completamente vencidos del Map. Sin esto, cada clave que se
 * usó una sola vez (una IP que pegó una vez a /api/contact y nunca volvió)
 * queda residente para siempre — con muchos visitantes distintos, o con un
 * atacante rotando la IP declarada (ver `getClientIp`), el Map crece sin
 * límite hasta agotar memoria. Barrido perezoso disparado desde
 * `isRateLimited()` como mucho una vez por intervalo (no `setInterval`, para
 * no mantener vivo el event loop en un runtime serverless).
 */
function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAtMs < SWEEP_INTERVAL_MS) return;
  lastSweepAtMs = now;

  for (const [key, timestamps] of buckets) {
    if (timestamps.every((t) => now - t >= MAX_BUCKET_AGE_MS)) {
      buckets.delete(key);
    }
  }
}

// Best-effort por instancia: en serverless cada instancia tiene su propio Map, así
// que no es un límite distribuido exacto, pero sí frena el abuso trivial (scripts
// que golpean el mismo endpoint en loop) sin depender de infraestructura extra.
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return false;
}

// Cuántos proxies de confianza hay delante de esta app (el edge del hosting
// — Vercel/Render — cuenta como uno). Cada proxy de confianza *añade* al
// final de X-Forwarded-For la IP que él mismo observó directamente; todo lo
// que venga antes de esa posición lo puede escribir el propio cliente en su
// request original, así que tomar la entrada más a la izquierda (como hacía
// este archivo antes) dejaba que cualquiera evadiera los 5 rate limiters del
// sistema mandando `X-Forwarded-For: <valor aleatorio>` en cada intento.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean);
    const trustedIndex = ips.length - TRUSTED_PROXY_HOPS;
    if (ips[trustedIndex]) return ips[trustedIndex];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
