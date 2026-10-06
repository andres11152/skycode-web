/**
 * Decide qué hacer con un error de base de datos en una consulta que alimenta
 * una página pública con ISR (portafolio, blog).
 *
 * - En `next build` SIN `DATABASE_URL` (CI no tiene Postgres) y en `next dev`:
 *   se silencia y el llamador devuelve vacío — la página se genera sin datos.
 *   En build CON `DATABASE_URL`, se relanza y el build falla.
 * - En producción en ejecución: se RELANZA. Si se devolviera `[]`/`null`, Next
 *   guardaría una página vacía (o un 404) como válida durante todo el
 *   `revalidate`; al lanzar, durante una revalidación Next conserva la última
 *   versión buena y reintenta en la siguiente petición. Bug real: un fallo
 *   momentáneo de la base dejó `/portafolio` sin casos en producción.
 */
export function shouldRethrowDbError(
  env: { NODE_ENV?: string; NEXT_PHASE?: string; DATABASE_URL?: string } = process.env
): boolean {
  if (env.NODE_ENV !== "production") return false;
  if (env.NEXT_PHASE !== "phase-production-build") return true;
  // En build SOLO se silencia cuando no hay base configurada (CI). Con
  // `DATABASE_URL` definida, un fallo de conexión debe abortar el build: si
  // se tragaba, la página se prerenderizaba como 404/vacía y se servía así
  // hasta el primer `revalidate` (en la home, para siempre).
  return Boolean(env.DATABASE_URL);
}

export function rethrowDbErrorAtRuntime(error: unknown): void {
  if (shouldRethrowDbError()) throw error;
}
