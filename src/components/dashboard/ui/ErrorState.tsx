"use client";

import Link from "next/link";
import { ArrowsClockwise, Warning } from "@phosphor-icons/react";

/**
 * Pantalla de error de una ruta del panel o del portal. Se dibuja DENTRO del
 * layout (con su cabecera/menú ya presentes), así que no usa `min-h-screen`:
 * eso añadía una pantalla entera de alto bajo la cabecera y dejaba el mensaje
 * a mitad de scroll. `role="alert"` para que se anuncie; el `digest` es la
 * referencia que el equipo técnico necesita para encontrar el error en el log.
 */
export function ErrorState({
  title,
  description,
  digest,
  onRetry,
  homeHref,
  homeLabel,
  contactHref,
}: {
  title: string;
  description: string;
  digest?: string;
  onRetry: () => void;
  homeHref: string;
  homeLabel: string;
  contactHref?: string;
}) {
  const focus =
    "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  return (
    <div role="alert" className="flex min-h-[55vh] items-center justify-center py-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger/25 bg-danger/10">
          <Warning size={22} className="text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 text-xs font-bold text-white shadow-md transition-all hover:brightness-90 ${focus}`}
          >
            <ArrowsClockwise size={14} aria-hidden="true" />
            Reintentar
          </button>
          <Link
            href={homeHref}
            className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/15 px-4 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 ${focus}`}
          >
            {homeLabel}
          </Link>
          {contactHref && (
            <a
              href={contactHref}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-medium text-accent-strong underline-offset-4 hover:underline ${focus}`}
            >
              Escribirnos
            </a>
          )}
        </div>
        {digest && (
          <p className="text-[11px] text-foreground/70">
            Referencia del error: <code className="font-mono">{digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
