"use client";

import { m as motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SPRING_SOFT } from "@/lib/animations";
import { usePointerFine } from "@/lib/usePointerFine";

/**
 * Inclina su contenido hasta `max` grados hacia el puntero, con perspectiva y un resorte suave.
 * Solo con puntero fino y sin reduced motion (en táctil no hay cursor que seguir): en esos casos
 * renderiza los hijos tal cual. Solo `transform` (rotateX/rotateY). Decorativo: no cambia el
 * contenido ni el orden de foco.
 */
export function Tilt({ children, max = 5, className }: { children: React.ReactNode; max?: number; className?: string }) {
  const reduced = useReducedMotion();
  const canHover = usePointerFine();
  const rotateX = useSpring(useMotionValue(0), SPRING_SOFT);
  const rotateY = useSpring(useMotionValue(0), SPRING_SOFT);

  if (reduced || !canHover) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        rotateY.set(px * max * 2);
        rotateX.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
