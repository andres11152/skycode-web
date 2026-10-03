"use client";

import { Printer, SlidersHorizontal } from "@phosphor-icons/react";
import { openCookiePreferences } from "@/lib/useConsent";

const BUTTON =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 bg-background px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background print:hidden";

/** Reabre el centro de preferencias de cookies (lo escucha `CookieBanner`). */
export function CookiePreferencesButton() {
  return (
    <div>
      <button type="button" onClick={openCookiePreferences} className={BUTTON}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        Preferencias de cookies
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={BUTTON}>
      <Printer size={16} aria-hidden="true" />
      Imprimir o guardar en PDF
    </button>
  );
}
