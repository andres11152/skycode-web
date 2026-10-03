/**
 * Decide qué hacer con un error de base de datos en una consulta que alimenta
 * una página pública con ISR (portafolio, blog).
 *
 * - En `next build` (CI no tiene Postgres) y en `next dev`: se silencia y el
 *   llamador devuelve vacío — la página se genera sin datos.
 * - En producción en ejecución: se RELANZA. Si se devolviera `[]`/`null`, Next
 *   guardaría una página vacía (o un 404) como válida durante todo el
 *   `revalidate`; al lanzar, durante una revalidación Next conserva la última
 *   versión buena y reintenta en la siguiente petición. Bug real: un fallo
 *   momentáneo de la base dejó `/portafolio` sin casos en producción.
 */
export function shouldRethrowDbError(env: { NODE_ENV?: string; NEXT_PHASE?: string } = process.env): boolean {
  return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

export function rethrowDbErrorAtRuntime(error: unknown): void {
  if (shouldRethrowDbError()) throw error;
}
