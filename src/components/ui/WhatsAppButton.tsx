"use client";

import { useState } from "react";
import { ChatCircle, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { getUiContent } from "@/content/ui";
import { defaultLocale, type Locale } from "@/lib/i18n";

const WHATSAPP_PHONE = "573138081081"; // Número de la agencia

export function WhatsAppButton({
  locale = defaultLocale,
  message,
}: {
  locale?: Locale;
  /** Sobreescribe el mensaje precargado (ej. /landing usa un texto calibrado
   * para tráfico de Google Ads en vez del genérico de la home). */
  message?: string;
}) {
  const uiData = getUiContent(locale);
  const [isOpen, setIsOpen] = useState(false);

  const waLink = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message ?? uiData.whatsappDefaultMessage)}`;

  return (
    // z-40: por debajo de Navbar (50), ScrollProgress (55), skip-link (60) y CookieBanner
    // (65) — el banner de cookies, que ocupa todo el ancho inferior, debe poder taparlo.
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto">
      {/* Popover / Chat Card Preview */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={uiData.whatsappHeading}
          className="mb-3 w-80 rounded-xl border border-foreground/15 bg-foreground/95 p-4 text-background shadow-2xl backdrop-blur-xl animate-enter-pop origin-bottom-right"
        >
          <div className="flex items-center justify-between border-b border-background/10 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground">
                <ChatCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-background leading-tight">{uiData.whatsappHeading}</h4>
                <span className="text-[10px] text-background/60 font-mono">{uiData.whatsappSchedule}</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-background/60 hover:bg-background/10 hover:text-background transition-colors"
              aria-label={uiData.whatsappClose}
            >
              <X size={16} />
            </button>
          </div>

          <div className="rounded-xl bg-background/10 p-3 text-xs leading-relaxed text-background/90 mb-4 font-sans">
            {uiData.whatsappPreview}
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-background px-4 py-2.5 text-xs font-bold text-foreground outline-none transition-[filter,transform] hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <span>{uiData.whatsappOpenChat}</span>
            <PaperPlaneTilt size={14} />
          </a>
        </div>
      )}

      {/* Botón flotante: blanco con borde fino, neutro. Se ve sobre las bandas claras y sobre las
          oscuras, y deja de competir con el acento de marca (antes: verde de WhatsApp con pulso infinito). */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-foreground/15 bg-background text-foreground shadow-lg shadow-black/10 outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 motion-reduce:transform-none"
        aria-label={uiData.whatsappTriggerAria}
      >
        <ChatCircle size={26} weight="regular" aria-hidden="true" />
      </button>
    </div>
  );
}
