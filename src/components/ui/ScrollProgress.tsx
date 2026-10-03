"use client";

import { m as motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

/** Adaptado de ScrollProgress (Magic UI, MIT) — un solo color de marca en vez del gradiente arcoíris del original. */
export function ScrollProgress({ className }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();
  // Spring con restDelta bajo: la barra sigue al scroll sin saltos en
  // ruedas de mouse por pasos, y se detiene exacto en 0/1. Con reduced
  // motion se usa el valor crudo (sigue siendo un indicador, sin inercia).
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className={cn("fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-accent", className)}
      style={{ scaleX: reduced ? scrollYProgress : smoothProgress }}
    />
  );
}
