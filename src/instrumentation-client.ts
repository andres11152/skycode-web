// Convención de Next.js 15.3+ — corre en el navegador antes de la hidratación de React.
// `@sentry/nextjs` pesa ~75 KiB de JS sin usar cuando no hay DSN configurado (medido con Lighthouse) y,
// con DSN, ~580 KB sin comprimir que se descargaban y evaluaban DURANTE la carga crítica. Un `import`
// estático lo empaqueta en el bundle del cliente; el `import()` dinámico evita que el navegador siquiera
// lo descargue sin DSN, y con DSN se inicializa cuando la página ya cargó y el navegador está ocioso
// (nunca compite con el LCP ni con la hidratación). Los errores que ocurran antes de eso se guardan y se
// reportan en cuanto el SDK está listo.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && typeof window !== "undefined") {
  const pending: unknown[] = [];
  const onError = (event: ErrorEvent) => pending.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => pending.push(event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const start = () => {
    void import("@sentry/nextjs").then((Sentry) =>
      import("@/lib/sentryScrub").then(({ sentryBaseOptions }) => {
        Sentry.init({ dsn, ...sentryBaseOptions, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0 });
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        for (const error of pending.splice(0)) Sentry.captureException(error);
      })
    );
  };
  const schedule = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 4000 });
    else globalThis.setTimeout(start, 2500);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}
