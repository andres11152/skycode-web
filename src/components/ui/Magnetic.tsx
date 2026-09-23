"use client";

import { useRef } from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";
import { usePointerFine } from "@/lib/usePointerFine";

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number; // Cuánto se mueve respecto al cursor (0.1 a 0.5)
  range?: number; // Radio de atracción en px
}

export function Magnetic({
  children,
  className,
  strength = 0.28,
  range = 80,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const canHover = usePointerFine();

  const springConfig = { stiffness: 180, damping: 14, mass: 0.1 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  if (reduced || !canHover) {
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distX = clientX - centerX;
    const distY = clientY - centerY;
    const distance = Math.hypot(distX, distY);

    if (distance < range) {
      x.set(distX * strength);
      y.set(distY * strength);
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
