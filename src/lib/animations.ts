import type { Variants } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Tokens de movimiento compartidos — los mismos valores existen en CSS como
// `--ease-out`/`--dur-fast`/`--dur-base` (theme.css), para que un hover en
// CSS puro y una entrada con Motion se sientan del mismo sistema.
// fast: feedback de press/hover · base: menús, popovers, banners · slow: entradas de bloque.
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.5 } as const;

/** Respuesta inmediata con muy poco rebote: píldoras activas, selección, press. */
export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 30 } as const;
/** Movimiento más amplio y suave: paneles, carruseles, seguimiento del puntero. */
export const SPRING_SOFT = { type: "spring", stiffness: 200, damping: 24 } as const;

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
