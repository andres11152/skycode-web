// Convención de Next.js 15.3+ — corre en el navegador antes de la
// hidratación de React. `@sentry/nextjs` pesa ~75 KiB de JS sin usar
// cuando no hay DSN configurado (medido con Lighthouse) — un `import`
// estático lo empaqueta en el bundle del cliente sin importar si el SDK
// termina activo o no. El `import()` dinámico evita que el navegador
// siquiera descargue ese chunk cuando `NEXT_PUBLIC_SENTRY_DSN` está vacío.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  });
}
