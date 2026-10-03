// Sin dependencias de Node (pg, bcrypt) a propósito: lo importa proxy.ts, que
// corre en Edge Runtime.

/**
 * Load-shedding en memoria (token bucket por IP) para descartar ráfagas ANTES
 * de gastar CPU de aplicación o una consulta a Postgres. Es mejor esfuerzo, no
 * una cuota exacta: cada instancia (y cada isolate de Edge) lleva su propio
 * `Map`, y un reinicio lo vacía. Para eso está el límite respaldado en
 * Postgres (`lib/rateLimit.ts`), que es la autoridad. Esto solo cubre el caso
 * que ese límite no puede: una inundación de peticiones donde cada una, aun
 * siendo rechazada, ya habría costado una ida y vuelta a la base.
 */

interface Bucket {
  tokens: number;
  updatedAtMs: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 20_000;

export interface ShedOptions {
  /** Ráfaga máxima permitida (tamaño del bucket). */
  capacity: number;
  /** Tokens que se reponen por segundo. */
  refillPerSecond: number;
}

/**
 * Consume un token de `key`. Devuelve `true` si la petición debe DESCARTARSE
 * (bucket vacío). No reparte entre instancias ni persiste nada.
 */
export function shouldShed(key: string, { capacity, refillPerSecond }: ShedOptions, nowMs: number = Date.now()): boolean {
  if (buckets.size >= MAX_TRACKED_KEYS) sweep(nowMs);

  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAtMs: nowMs };
  const elapsedSeconds = Math.max(0, (nowMs - bucket.updatedAtMs) / 1000);
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  bucket.updatedAtMs = nowMs;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return true;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return false;
}

/**
 * Libera los buckets que ya se rellenaron por completo (equivalen a "no hay
 * historial"). Si aun así el mapa sigue lleno —un atacante rotando IPs—, se
 * vacía entero: se prefiere perder el historial de todos a crecer sin límite
 * y tumbar el proceso por memoria, que sería el DoS que esto debe evitar.
 */
function sweep(nowMs: number): void {
  for (const [key, bucket] of buckets) {
    if (nowMs - bucket.updatedAtMs > 60_000) buckets.delete(key);
  }
  if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
}

/** Solo para tests. */
export function resetLoadShedForTests(): void {
  buckets.clear();
}
