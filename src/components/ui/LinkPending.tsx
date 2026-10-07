"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Indicador de "este enlace está navegando": mientras el destino carga, un
 * brillo suave cruza el control pulsado. Va DENTRO de un `<Link>` (lo exige
 * `useLinkStatus`) y el enlace debe ser `relative`. No renderiza nada en
 * reposo, así que no cuesta layout; con `prefers-reduced-motion` el brillo no
 * se mueve y queda un velo fijo. `rounded-[inherit]` recorta el brillo con el
 * radio del propio enlace (píldora, tarjeta, fila).
 *
 * Es retroalimentación inmediata complementaria a la barra de progreso global
 * (`NavigationProgress`): la barra dice "algo carga", esto dice "esto que
 * pulsaste".
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
      <span className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-current/15 to-transparent motion-safe:animate-[link-shimmer_900ms_var(--ease-in-out)_infinite] motion-reduce:w-full motion-reduce:via-current/10" />
    </span>
  );
}
