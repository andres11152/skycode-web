"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Grados máximos de inclinación (3-8 grados para elegancia)
  spotlight?: boolean;
}

export function TiltCard({
  children,
  className,
  maxTilt = 6,
  spotlight = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    setCanHover(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.2 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const mouseX = useMotionValue(-300);
  const mouseY = useMotionValue(-300);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canHover || reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Actualizar posición del halo
      mouseX.set(clientX);
      mouseY.set(clientY);

      // Calcular ángulo de inclinación 3D
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltY = ((clientX - centerX) / centerX) * maxTilt;
      const tiltX = -((clientY - centerY) / centerY) * maxTilt;

      rotateX.set(tiltX);
      rotateY.set(tiltY);
    },
    [canHover, maxTilt, mouseX, mouseY, reduced, rotateX, rotateY],
  );

  const handlePointerLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    mouseX.set(-300);
    mouseY.set(-300);
  }, [rotateX, rotateY, mouseX, mouseY]);

  const spotlightBg = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, rgba(0, 137, 205, 0.12), transparent 75%)`;

  if (reduced || !canHover) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn("group relative h-full transition-shadow duration-300", className)}
      >
        {/* Spotlight dinámico que sigue al cursor */}
        {spotlight && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: spotlightBg }}
          />
        )}
        <div className="relative z-20 h-full">{children}</div>
      </motion.div>
    </div>
  );
}
