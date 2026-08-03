"use client";

import { motion, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

/** Adaptado de ScrollProgress (Magic UI, MIT) — un solo color de marca en vez del gradiente arcoíris del original. */
export function ScrollProgress({ className }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      aria-hidden="true"
      className={cn("fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-accent", className)}
      style={{ scaleX: scrollYProgress }}
    />
  );
}
