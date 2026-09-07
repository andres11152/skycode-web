import * as Sentry from "@sentry/nextjs";

// Convención de Next.js 15.3+ — corre en el navegador antes de la
// hidratación de React. Sin `NEXT_PUBLIC_SENTRY_DSN` (mismo criterio que
// el server config), el SDK queda inactivo, no hace falta un guard extra.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
