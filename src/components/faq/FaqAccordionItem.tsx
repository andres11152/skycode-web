"use client";

import { useEffect, useRef } from "react";
import { Plus } from "@phosphor-icons/react";
import { InlineText } from "@/components/blog/InlineText";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/content/faq";

/**
 * Pregunta como `<details>/<summary>` NATIVO, no como botón + estado:
 *  - la respuesta está SIEMPRE en el HTML (indexable y encontrable con Ctrl+F;
 *    Chrome/Firefox/Safari abren el `<details>` que contiene la coincidencia);
 *  - teclado, `aria-expanded` implícito y foco salen gratis del navegador;
 *  - funciona incluso antes de hidratar.
 * La altura no se anima (regla del proyecto): la respuesta entra con un
 * fundido + 6px (`animate-faq-in`, CSS) y el "+" rota con `group-open:`.
 *
 * `linkable` activa el modo página: `id` como ancla (`/preguntas-frecuentes#id`),
 * apertura automática si la URL trae ese hash y botón para copiar el enlace.
 * La home lo deja apagado (mismas preguntas, sin anclas).
 */
export function FaqAccordionItem({
  item,
  className,
  linkable = false,
  shareUrl,
  copyLabel,
  copiedLabel,
  openOnMount = false,
  animateIn = false,
  highlight,
}: {
  item: FaqItem;
  className?: string;
  linkable?: boolean;
  shareUrl?: string;
  copyLabel?: string;
  copiedLabel?: string;
  openOnMount?: boolean;
  animateIn?: boolean;
  /** Pregunta con coincidencias resaltadas (la búsqueda de la página); si falta, texto plano. */
  highlight?: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // Un enlace directo (`#id`) o un cambio de hash abren la pregunta. El
  // scroll lo hace el navegador (el elemento existe en el HTML, con
  // `scroll-mt` por el Navbar fijo); aquí solo se abre.
  useEffect(() => {
    if (!linkable) return;
    const openIfTargeted = () => {
      if (window.location.hash === `#${item.id}` && ref.current) ref.current.open = true;
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [linkable, item.id]);

  return (
    <details
      ref={ref}
      id={linkable ? item.id : undefined}
      open={openOnMount || undefined}
      className={cn(
        "group relative scroll-mt-28 border-b border-foreground/10",
        // Marca de "esta es la pregunta del enlace": una barra que crece con
        // scaleY (transform) cuando el hash apunta aquí. En neutro, sin acento.
        "before:absolute before:inset-y-5 before:-left-4 before:hidden before:w-0.5 before:origin-top before:scale-y-0 before:bg-foreground before:transition-transform before:duration-500 before:ease-out target:before:block target:before:scale-y-100 motion-reduce:before:transition-none",
        animateIn && "animate-faq-in",
        className,
      )}
    >
      <summary
        className={cn(
          "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-left outline-none",
          "[&::-webkit-details-marker]:hidden",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <h3 className="text-base font-semibold text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-lg">
          {highlight ?? item.question}
        </h3>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors duration-200 group-hover:bg-accent-strong group-hover:text-white"
        >
          <Plus
            size={16}
            weight="bold"
            className="transition-transform duration-300 ease-out group-open:rotate-45 motion-reduce:transition-none"
          />
        </span>
      </summary>

      <div className="animate-faq-in pb-6 pr-4 sm:pr-12">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base sm:leading-relaxed">
          <InlineText text={item.answer} />
        </p>
        {linkable && shareUrl && copyLabel && copiedLabel && (
          <div className="mt-2 -ml-3">
            <CopyButton value={shareUrl} label={copyLabel} copiedLabel={copiedLabel} />
          </div>
        )}
      </div>
    </details>
  );
}
