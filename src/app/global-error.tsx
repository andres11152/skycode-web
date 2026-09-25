"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowsClockwise, Warning } from "@phosphor-icons/react";
import { Geist_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { getErrorsContent } from "@/content/errors";
import { defaultLocale, isLocale, localeHomePath } from "@/lib/i18n";
import { logError } from "@/lib/logger";
import "./globals.css";

// `preload: false` en las tres: Next precarga las fuentes de global-error en
// TODAS las rutas, no solo cuando esta página se muestra — Geist Mono (24KB,
// prioridad alta) terminaba en la ruta crítica del LCP de cada página sin
// que ninguna la usara. Con `display: "swap"` la página de error igual las
// descarga al pintarse; solo deja de pagarlas el resto del sitio.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/**
 * Reemplaza el layout raíz entero cuando algo revienta por encima del árbol
 * normal de componentes (ej. un error en el propio `layout.tsx`) — por eso
 * trae su propio `<html>`/`<body>` y no puede depender de `LocaleProvider`
 * (no está montado). El locale se deriva del pathname directamente, mismo
 * criterio que `LocaleProvider` usa internamente.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const segment = pathname?.split("/")[1] ?? "";
  const locale = isLocale(segment) ? segment : defaultLocale;
  const content = getErrorsContent(locale).globalError;

  useEffect(() => {
    logError("❌ [Global Error Boundary]", error);
  }, [error]);

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600">
            <Warning size={26} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-3 text-foreground/80 leading-relaxed">{content.description}</p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-strong px-6 text-sm font-semibold text-accent-foreground outline-none transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowsClockwise size={16} />
              {content.ctaRetry}
            </button>
            <a
              href={localeHomePath(locale)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 px-6 text-sm font-semibold text-foreground/80 outline-none transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {content.ctaHome}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
