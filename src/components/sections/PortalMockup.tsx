import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Retardo (ms) de la animación `assemble` de cada pieza: el portal "se arma" en ~1 s. */
const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;
import { BrowserFrame } from "@/components/ui/BrowserFrame";
import type { getHeroContent } from "@/content/hero";

type PortalCopy = ReturnType<typeof getHeroContent>["portalMockup"];

/**
 * Vista de ejemplo del portal de clientes (entregables con aprobación, facturas
 * y comentarios del equipo): es el producto real que recibe el cliente, no un
 * mockup genérico de código. Server Component, sin JS ni animación de entrada:
 * vive en el primer pantallazo y no debe competir con el LCP.
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
          <div className="flex flex-col gap-5 bg-background p-5 sm:p-6">
            <div style={delay(90)} className="assemble flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-foreground">{copy.project}</p>
                <p className="mt-0.5 font-mono text-xs text-foreground/70">{copy.projectMeta}</p>
              </div>
              <span className="rounded-full border border-foreground/10 px-2.5 py-1 font-mono text-[11px] text-foreground/70">
                {copy.invoice.label} {copy.invoice.number} · {copy.invoice.status}
              </span>
            </div>

            <div>
              <p style={delay(150)} className="assemble font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-foreground/70">
                {copy.deliverablesLabel}
              </p>
              <ul className="mt-3 flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10">
                {copy.sprints.map((sprint, index) => (
                  <li key={sprint.name} style={delay(210 + index * 85)} className="assemble flex flex-col gap-2.5 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                        <span className="font-mono text-xs text-foreground/60">{String(index + 1).padStart(2, "0")}</span>
                        {sprint.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          sprint.state === "done" && "bg-foreground text-background",
                          sprint.state === "active" && "border border-foreground/30 text-foreground",
                          sprint.state === "todo" && "border border-foreground/10 text-foreground/70",
                        )}
                      >
                        {sprint.status}
                      </span>
                    </div>
                    <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
                      <span
                        style={{ width: `${sprint.progress}%`, ...delay(360 + index * 85) }}
                        className="assemble-fill block h-full rounded-full bg-foreground"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={delay(520)} className="assemble flex items-start gap-3 rounded-xl bg-foreground/[0.04] p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs font-bold text-background">
                S
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">{copy.comment.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{copy.comment.text}</p>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </div>
      <figcaption className="mt-3 font-mono text-[11px] text-foreground/70">{copy.caption}</figcaption>
    </figure>
  );
}
