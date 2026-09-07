import * as Sentry from "@sentry/nextjs";

// Config de Sentry para el runtime Edge (src/proxy.ts) — separado del
// server config porque el Edge Runtime no tiene todas las APIs de Node
// que el SDK completo usa. Mismo comportamiento sin DSN: inactivo.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
