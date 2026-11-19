"use client";

import { useRef, type ReactNode } from "react";
import { m as motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Línea vertical de la línea de tiempo de Proceso en móvil (por debajo de `sm`): se dibuja con el
 * scroll (`useScroll` sobre el propio bloque + `useSpring`, solo `scaleY`). Desde `sm` no se pinta
 * y Proceso vuelve a su línea horizontal en CSS. Con reduced motion, la línea queda completa y quieta.
 */
export function ProcessTimeline({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <div ref={ref} className="relative">
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-[4.5px] w-px bg-foreground/15 sm:hidden" />
      <motion.span
        aria-hidden="true"
        style={reduced ? undefined : { scaleY, originY: 0 }}
        className="absolute top-2 bottom-2 left-[4.5px] w-px bg-foreground sm:hidden"
      />
      {children}
    </div>
  );
}
