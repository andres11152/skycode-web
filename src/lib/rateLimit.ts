import { query } from "./db";
import { logError } from "./logger";

// Probabilidad de disparar la limpieza de filas vencidas en cualquier
// llamada dada — mismo criterio de "barrido perezoso" que la versión
// anterior en memoria (`sweepExpiredBuckets`): no vale la pena un cron
// dedicado solo para esto, así que se aprovecha una fracción pequeña de
// las llamadas normales para no dejar crecer la tabla sin límite con
// claves que se usaron una sola vez (una IP que pegó una vez a
// /api/contact y nunca volvió).
const SWEEP_PROBABILITY = 0.01;

/**
 * Borra filas cuya ventana empezó hace más de 1 hora — cota superior
 * generosa sobre cualquier `windowMs` real usado en el proyecto (hoy el
 * mayor es 10 minutos), así que una fila más vieja que esto ya expiró para
 * cualquier llamador posible sin necesidad de conocer el `windowMs`
 * específico que la creó.
 */
async function sweepExpiredRateLimits(): Promise<void> {
  if (Math.random() >= SWEEP_PROBABILITY) return;

  try {
    await query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';`);
  } catch (error) {
    // Un fallo de limpieza no debe tumbar el rate limiting en sí — en el
    // peor caso, la tabla crece un poco más hasta el próximo barrido que sí
    // funcione.
    logError("⚠️ [RateLimit] sweepExpiredRateLimits falló", error);
  }
}

/**
 * Rate limiter de ventana fija respaldado en PostgreSQL — reemplaza la
 * versión anterior en memoria (`Map` por proceso), que en un hosting con
 * más de una instancia (o simplemente tras el siguiente deploy, que
 * reinicia el proceso) dejaba que un atacante evadiera el límite sin
 * ningún esfuerzo: cada instancia contaba sus propios intentos, y un
 * reinicio los borraba todos.
 *
 * Es una ventana fija, no un log de timestamps deslizante como la versión
 * anterior — una sola fila por `key` con un contador y el inicio de su
 * ventana actual, actualizada con un único `UPSERT` atómico (sin condición
 * de carrera entre leer y escribir, mismo patrón que
 * `consumeNextInvoiceNumber` en lib/queries/settings.ts). La diferencia
 * práctica contra abuso real (bots/scripts golpeando un endpoint, no un
 * atacante cronometrando milisegundos exactos) es insignificante, y a
 * cambio se evita tener que expresar un log de timestamps en SQL.
 *
 * Siempre incrementa el contador, incluso cuando el request ya está
 * bloqueado (a diferencia de la versión en memoria, que dejaba de
 * registrar una vez alcanzado el límite) — no cambia el resultado (sigue
 * bloqueado) y simplifica el `UPSERT` a una sola sentencia sin una
 * segunda ida y vuelta para decidir si conviene registrar el intento.
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  return (await incrementAttempts(key, windowMs)) > limit;
}

/**
 * Suma 1 al contador de `key` (abriendo una ventana nueva si la anterior
 * venció) y devuelve el total de la ventana vigente. Es el `UPSERT` atómico
 * de siempre; `isRateLimited` es solo `incrementAttempts(...) > limit`.
 * Existe aparte para quien necesita el NÚMERO (ej. subir la dificultad del
 * proof-of-work según los fallos acumulados), no solo un sí/no.
 */
export async function incrementAttempts(key: string, windowMs: number): Promise<number> {
  await sweepExpiredRateLimits();

  const res = await query(
    `INSERT INTO rate_limits (key, count, window_start)
     VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE
         WHEN now() - rate_limits.window_start >= ($2::numeric * interval '1 millisecond')
         THEN 1
         ELSE rate_limits.count + 1
       END,
       window_start = CASE
         WHEN now() - rate_limits.window_start >= ($2::numeric * interval '1 millisecond')
         THEN now()
         ELSE rate_limits.window_start
       END
     RETURNING count;`,
    [key, windowMs]
  );

  return Number(res.rows[0].count);
}

/**
 * Lee el contador de `key` SIN incrementarlo (0 si no existe o su ventana
 * ya venció). Para decisiones de solo lectura — "¿esta IP ya acumuló
 * demasiados fallos?" — que no deben contar como un intento más.
 */
export async function peekAttempts(key: string, windowMs: number): Promise<number> {
  const res = await query(
    `SELECT count FROM rate_limits
     WHERE key = $1 AND now() - window_start < ($2::numeric * interval '1 millisecond');`,
    [key, windowMs]
  );
  return res.rows[0] ? Number(res.rows[0].count) : 0;
}

/** Borra el contador de `key` (ej. los fallos de un email tras un login exitoso). */
export async function resetAttempts(key: string): Promise<void> {
  await query("DELETE FROM rate_limits WHERE key = $1;", [key]);
}

// `getClientIp` vive en un módulo aparte (sin `pg`) para poder usarse desde
// proxy.ts, que corre en Edge Runtime. Se re-exporta acá para no tocar a los
// ~20 llamadores existentes.
export { getClientIp } from "./clientIp";
