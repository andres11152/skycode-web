import * as Sentry from "@sentry/nextjs";

/**
 * Reemplazo de `console.error()` para errores capturados en un catch —
 * loguea igual que antes (mismo mensaje, mismo formato visible en
 * terminal/logs del hosting) y además reporta a Sentry si `SENTRY_DSN`/
 * `NEXT_PUBLIC_SENTRY_DSN` está configurada (ver sentry.*.config.ts y
 * src/instrumentation-client.ts). Sin esas variables, la llamada a Sentry
 * es un no-op — nunca rompe nada por no tener la cuenta configurada.
 *
 * Isomórfico a propósito (funciona en Server Components, Route Handlers y
 * Client Components): `@sentry/nextjs` expone la misma API en ambos
 * entornos, así que un solo helper cubre los ~30 archivos que antes
 * llamaban `console.error` directo, sin duplicar lógica por entorno.
 */
export function logError(message: string, error: unknown, extra?: Record<string, unknown>): void {
  if (extra) {
    console.error(message, { ...extra, error });
  } else {
    console.error(message, error);
  }

  Sentry.captureException(error, { extra: { message, ...extra } });
}
