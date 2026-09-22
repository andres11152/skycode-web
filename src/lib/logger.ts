/**
 * Reemplazo de `console.error()` para errores capturados en un catch —
 * loguea igual que antes (mismo mensaje, mismo formato visible en
 * terminal/logs del hosting) y además reporta a Sentry si `SENTRY_DSN`/
 * `NEXT_PUBLIC_SENTRY_DSN` está configurada (ver sentry.*.config.ts y
 * src/instrumentation-client.ts). Sin esas variables, no se importa
 * `@sentry/nextjs` en absoluto — un `import` estático lo empaquetaba en
 * el bundle del cliente (~75 KiB de JS sin usar, medido con Lighthouse)
 * sin importar si el SDK terminaba activo o no. Como este helper lo
 * importan ~30 archivos, incluidos componentes de cliente (ej.
 * Contact.tsx), ese peso viajaba a cada visitante del sitio público.
 *
 * Isomórfico a propósito (funciona en Server Components, Route Handlers y
 * Client Components): `typeof window` distingue qué variable de entorno
 * mirar en cada lado, ya que solo `NEXT_PUBLIC_*` se inyecta en el
 * bundle del navegador — con esa variable vacía en build, bundlers como
 * Turbopack eliminan el `import()` dinámico como código muerto, así que
 * el navegador nunca llega a pedir ese chunk.
 */
export function logError(message: string, error: unknown, extra?: Record<string, unknown>): void {
  if (extra) {
    console.error(message, { ...extra, error });
  } else {
    console.error(message, error);
  }

  const sentryConfigured =
    typeof window === "undefined" ? Boolean(process.env.SENTRY_DSN) : Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (sentryConfigured) {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, { extra: { message, ...extra } });
    });
  }
}
