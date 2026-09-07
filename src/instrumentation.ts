import * as Sentry from "@sentry/nextjs";

/**
 * Convención de Next.js — corre una vez al iniciar la instancia del
 * servidor, antes de aceptar requests. Carga el config de Sentry del
 * runtime correcto (Node vs Edge, ver sentry.server.config.ts /
 * sentry.edge.config.ts en la raíz) según `NEXT_RUNTIME`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captura errores de servidor que Next.js atrapa internamente (Server
// Components, Route Handlers, Server Actions, Proxy) y que nunca pasan por
// un try/catch propio con lib/logger.ts — ej. un throw sin capturar dentro
// de un Server Component. Complementa, no reemplaza, las llamadas
// explícitas de logError() en los catch de las rutas de API.
export const onRequestError = Sentry.captureRequestError;
