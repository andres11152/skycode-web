import type { CSSProperties } from "react";
import { PortalLiveDemo } from "@/components/sections/PortalLiveDemo";

/** Retardo (ms) de la animación `assemble` de cada pieza: el portal "se arma" en ~1 s. */
const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;
import { BrowserFrame } from "@/components/ui/BrowserFrame";
import type { getHeroContent } from "@/content/hero";

type PortalCopy = ReturnType<typeof getHeroContent>["portalMockup"];

/**
 * Vista de ejemplo del portal de clientes (entregables con aprobación, facturas
 * y comentarios del equipo): es el producto real que recibe el cliente, no un
 * mockup genérico de código. El marco es Server Component y "se arma" con CSS;
 * los entregables y el comentario son una isla cliente (`PortalLiveDemo`) que
 * cuenta en movimiento cómo avanza un proyecto. Nada de esto es el LCP.
 *
 * Los datos son ilustrativos y así se rotula (`caption`, visible). Decorativo
 * para lectores de pantalla (`aria-hidden`): el mismo mensaje ya está en el texto
 * del hero.
 */
export function PortalMockup({ copy }: { copy: PortalCopy }) {
  return (
    <figure aria-hidden="true" className="relative w-full max-w-xl">
      <div style={delay(0)} className="assemble overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-[0_24px_60px_-20px_rgba(10,10,10,0.25)]">
        <BrowserFrame url={copy.url} className="rounded-none">
          <div className="flex flex-col gap-5 bg-background p-5 max-sm:gap-4 max-sm:p-4 sm:p-6">
            <div style={delay(90)} className="assemble flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-foreground">{copy.project}</p>
                <p className="mt-0.5 font-mono text-xs text-foreground/70">{copy.projectMeta}</p>
              </div>
              {/* En móvil se oculta: a 390 px se partía en dos líneas y alargaba el mockup. */}
              <span className="rounded-full border border-foreground/10 px-2.5 py-1 font-mono text-[11px] text-foreground/70 max-sm:hidden">
                {copy.invoice.label} {copy.invoice.number} · {copy.invoice.status}
              </span>
            </div>

            {/* Entregables y comentario: isla cliente con la demostración viva (ver PortalLiveDemo). */}
            <PortalLiveDemo copy={copy} />
          </div>
        </BrowserFrame>
      </div>
      <figcaption className="mt-3 font-mono text-[11px] text-foreground/70">{copy.caption}</figcaption>
    </figure>
  );
}
