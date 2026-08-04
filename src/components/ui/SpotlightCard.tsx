"use client";

import { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightSize?: number;
  enableTilt?: boolean;
}

/**
 * Tarjeta interactiva con 3D Tilt, halo de enfoque magnético y espejo vidriado (Glassmorphism).
 */
export function SpotlightCard({
  children,
  className,
  spotlightSize = 280,
  enableTilt = true,
}: SpotlightCardProps) {
  const reduced = Boolean(useReducedMotion());
  const mouseX = useMotionValue(-spotlightSize);
  const mouseY = useMotionValue(-spotlightSize);

  // 3D Tilt Motion Values
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 220, mass: 0.5 };
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mouseX.set(x);
      mouseY.set(y);

      if (enableTilt && !reduced) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateXVal = ((y - centerY) / centerY) * -7; // Max tilt 7 deg
        const rotateYVal = ((x - centerX) / centerX) * 7;
        rawRotateX.set(rotateXVal);
        rawRotateY.set(rotateYVal);
      }
    },
    [mouseX, mouseY, rawRotateX, rawRotateY, enableTilt, reduced],
  );

  const handlePointerLeave = useCallback(() => {
    mouseX.set(-spotlightSize);
    mouseY.set(-spotlightSize);
    rawRotateX.set(0);
    rawRotateY.set(0);
  }, [mouseX, mouseY, rawRotateX, rawRotateY, spotlightSize]);

  const spotlightBg = useMotionTemplate`radial-gradient(${spotlightSize}px circle at ${mouseX}px ${mouseY}px, rgba(0, 137, 205, 0.12), transparent 70%)`;
  const specularBg = useMotionTemplate`radial-gradient(${spotlightSize * 0.75}px circle at ${mouseX}px ${mouseY}px, rgba(255, 209, 0, 0.15), transparent 60%)`;

  return (
    <motion.div
      style={
        enableTilt && !reduced
          ? {
              perspective: 1000,
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }
          : undefined
      }
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

      {/* Specular Yellow Highlight Glare */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: specularBg }}
      />

      {/* Subtle Grain Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-[0.025] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"
      />

      <div className="relative z-20 h-full">{children}</div>
    </motion.div>
  );
}

