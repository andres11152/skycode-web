"use client";

import { useState } from "react";
import { RssSimple } from "@phosphor-icons/react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export interface RssSubscribeLabels {
  cta: string;
  title: string;
  description: string;
  copy: string;
  copied: string;
  openFeedly: string;
  openInoreader: string;
  viewFeed: string;
  close: string;
}

const ACTION =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/20 px-5 text-sm font-semibold text-foreground outline-none transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-foreground/35 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * "Suscribirse por RSS": abre un diálogo con la URL del feed, copiarla y
 * abrirla directo en un lector (Feedly, Inoreader).
 *
 * Antes era un enlace a `/feed.xml`: en Safari y Firefox un feed
 * (`application/rss+xml`) se descarga en silencio en vez de mostrarse, y
 * desde la página el botón parecía no hacer nada. Y con `<Link>` de Next la
 * navegación del lado del cliente pedía el feed como si fuera una página y
 * fallaba. Suscribirse en realidad consiste en pegar una URL en un lector,
 * así que el botón ahora hace justo eso y siempre da una respuesta visible.
 */
export function RssSubscribe({
  feedUrl,
  feedPath,
  labels,
}: {
  /** Absoluta: es lo que se pega en un lector y lo que reciben Feedly/Inoreader. */
  feedUrl: string;
  /** Relativa, para "ver el feed" dentro del mismo sitio. */
  feedPath: string;
  labels: RssSubscribeLabels;
}) {
  const [open, setOpen] = useState(false);
  const encoded = encodeURIComponent(feedUrl);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full border border-background/25 px-9 py-3.5 text-base font-semibold text-background outline-none transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-background/40 hover:bg-background/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground active:scale-[0.97] motion-reduce:active:scale-100"
      >
        <RssSimple size={18} aria-hidden="true" />
        {labels.cta}
      </button>

      {/* `text-foreground`: Modal no usa portal, así que hereda el texto blanco de la
          banda oscura donde vive este botón — sin esto el título quedaba blanco sobre blanco. */}
      <Modal open={open} onClose={() => setOpen(false)} title={labels.title} closeLabel={labels.close} className="text-foreground">
        <p className="text-sm leading-relaxed text-foreground/80">{labels.description}</p>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-foreground py-1 pr-1 pl-4">
          <code className="min-w-0 flex-1 py-2 font-mono text-[13px] leading-snug break-all text-background select-all">{feedUrl}</code>
          <CopyButton
            value={feedUrl}
            label={labels.copy}
            copiedLabel={labels.copied}
            className="text-background/80 hover:bg-background/10 hover:text-background focus-visible:ring-offset-foreground"
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a href={`https://feedly.com/i/subscription/feed/${encoded}`} target="_blank" rel="noopener noreferrer" className={ACTION}>
            {labels.openFeedly}
          </a>
          <a href={`https://www.inoreader.com/?add_feed=${encoded}`} target="_blank" rel="noopener noreferrer" className={ACTION}>
            {labels.openInoreader}
          </a>
          <a href={feedPath} className={cn(ACTION, "border-transparent text-foreground/80 underline underline-offset-4 hover:border-transparent")}>
            {labels.viewFeed}
          </a>
        </div>
      </Modal>
    </>
  );
}
