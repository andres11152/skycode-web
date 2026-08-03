import type { Variants } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function fadeUp(reduced = false): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.01 : 0.6, ease: EASE_OUT },
    },
  };
}

export function scaleUp(reduced = false): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: reduced ? 0.01 : 0.5, ease: EASE_OUT },
    },
  };
}

export function staggerContainer(
  reduced = false,
  staggerChildren = 0.1,
  delayChildren = 0,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : staggerChildren,
        delayChildren: reduced ? 0 : delayChildren,
      },
    },
  };
}
