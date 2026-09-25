"use client";

import { useCallback } from "react";
import { m as motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightSize?: number;
}

/**
 * Tarjeta con un halo de enfoque azul (accent) que sigue al mouse — sutil,
 * sin tilt 3D ni glare de color secundario (ver CLAUDE.md: el amarillo se
 * reserva para el punto del Footer).
 */
export function SpotlightCard({ children, className, spotlightSize = 280 }: SpotlightCardProps) {
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

  const spotlightBg = useMotionTemplate`radial-gradient(${spotlightSize}px circle at ${mouseX}px ${mouseY}px, rgba(0, 137, 205, 0.12), transparent 70%)`;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("group relative isolate transition-shadow duration-300", className)}
    >
      {/* Spotlight Radial Background */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlightBg }}
      />

      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
}

