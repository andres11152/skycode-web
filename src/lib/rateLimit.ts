const buckets = new Map<string, number[]>();

// Best-effort por instancia: en serverless cada instancia tiene su propio Map, así
// que no es un límite distribuido exacto, pero sí frena el abuso trivial (scripts
// que golpean el mismo endpoint en loop) sin depender de infraestructura extra.
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return false;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
