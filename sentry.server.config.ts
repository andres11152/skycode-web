import * as Sentry from "@sentry/nextjs";

// Sin `SENTRY_DSN` configurada (desarrollo local, o antes de que exista una
// cuenta de Sentry real), el SDK queda inactivo automáticamente — no hace
// falta un guard manual, `Sentry.init` con `dsn: undefined` simplemente no
// envía nada.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Turbopack (bundler por defecto en Next 16, ver next.config.ts) no
  // soporta la instrumentación automática de build de Sentry (wrapping de
  // rutas/middleware, subida de source maps) — ver el comentario de
  // `autoInstrumentServerFunctions` en el SDK. Por eso este proyecto no
  // envuelve next.config.ts con `withSentryConfig`: la captura de errores
  // igual funciona vía `onRequestError` (instrumentation.ts) y las
  // llamadas explícitas de lib/logger.ts, independientes del bundler.
  tracesSampleRate: 0.1,
});
