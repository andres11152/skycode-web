"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "@phosphor-icons/react";
import { useLocale } from "@/components/LocaleProvider";
import { getCookieBannerContent } from "@/content/cookieBanner";
import { EsBadge } from "@/components/ui/EsBadge";

const STORAGE_KEY = "skycode-cookie-notice-ack";

export function CookieBanner() {
  const locale = useLocale();
  const cookieData = getCookieBannerContent(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // La lectura de localStorage vive en un microtask (no directo en el cuerpo del
    // efecto) para que el setState quede dentro de un callback y no dispare la regla
    // de lint react-hooks/set-state-in-effect — mismo principio que GridPattern
    // (el estado se genera dentro del callback de un sistema externo, no del efecto).
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    });
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={cookieData.ariaLabel}
      className="fixed inset-x-0 bottom-0 z-[65] border-t border-foreground/10 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      {/* Compacto en mobile a propósito: la versión anterior (icono +
          párrafo + botón, los tres apilados en `flex-col`) ocupaba ~22% del
          viewport de un teléfono y tapaba los CTA del Hero (bug real, visto
          en auditoría visual). El icono se oculta bajo `sm:` y el botón deja
          de estirarse a todo el ancho — sigue siendo la misma barra
          full-width que cubre a `WhatsAppButton` hasta descartarse (ver
          CLAUDE.md), solo más baja. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent sm:flex"
          >
            <Cookie size={18} />
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed sm:text-sm">
            {cookieData.message}{" "}
            {/* Sin prefetch: el banner está en pantalla en toda primera
                visita, así que prefetchear la política (2 descargas RSC) le
                costaba red a cada visitante durante la carga para un link
                que casi nadie abre. */}
            <Link
              href={cookieData.linkUrl}
              prefetch={false}
              className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
            >
              {cookieData.linkText}
            </Link>
            {locale !== "es" && <EsBadge className="ml-1.5" />}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-11 shrink-0 items-center justify-center self-end rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-foreground outline-none transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:ml-4 sm:self-auto"
        >
          {cookieData.accept}
        </button>
      </div>
    </div>
  );
}
