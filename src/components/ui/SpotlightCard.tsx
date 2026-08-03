"use client";

import { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightSize?: number;
}

/**
 * Halo que sigue el cursor, adaptado de MagicCard (Magic UI, MIT).
 * Simplificado a propósito: sin el modo "orb" ni detección de tema del
 * original — este sitio es de modo claro fijo, un solo acento.
 */
export function SpotlightCard({ children, className, spotlightSize = 240 }: SpotlightCardProps) {
  const mouseX = useMotionValue(-spotlightSize);
  const mouseY = useMotionValue(-spotlightSize);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  const handlePointerLeave = useCallback(() => {
    mouseX.set(-spotlightSize);
    mouseY.set(-spotlightSize);
  }, [mouseX, mouseY, spotlightSize]);

  const background = useMotionTemplate`radial-gradient(${spotlightSize}px circle at ${mouseX}px ${mouseY}px, rgba(0, 137, 205, 0.1), transparent 70%)`;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("group relative isolate", className)}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
}
