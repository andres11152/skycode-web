import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * `beforeSend` de Sentry: nunca enviar correos de clientes ni cabeceras con
 * credenciales. Los mensajes de error de Postgres/Resend suelen incluir el
 * correo del usuario (p. ej. "Key (email)=(x@y.com) already exists").
 */
export function scrubSentryEvent<T extends ErrorEvent>(event: T): T {
  const scrub = (text: string | undefined) => text?.replace(EMAIL, "[email]");
  if (event.message) event.message = scrub(event.message);
  for (const exception of event.exception?.values ?? []) {
    exception.value = scrub(exception.value);
  }
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-cron-secret"];
    }
  }
  return event;
}

export const sentryBaseOptions = {
  environment: process.env.NODE_ENV,
  release: process.env.RENDER_GIT_COMMIT,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubSentryEvent,
} as const;
