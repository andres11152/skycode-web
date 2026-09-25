"use client";

import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("@/lib/framerMotionFeatures").then((mod) => mod.default);

/**
 * Envuelve todo el árbol una sola vez en el layout raíz. Cada componente que
 * antes importaba `motion` de "framer-motion" ahora importa `m` bajo ese
 * mismo nombre (`import { m as motion } from "framer-motion"`, sin tocar el
 * JSX) — `motion.div` sigue funcionando igual, pero el bundle pesado de
 * gestos/animaciones/drag (`domMax`, ver framerMotionFeatures.ts) ya no
 * viaja en el chunk síncrono de cada página: se pide aparte y se resuelve
 * cuando `LazyMotion` lo necesita, fuera de la ruta crítica del primer
 * pintado. `domMax` (no `domAnimation`) porque Testimonials.tsx usa `layout`
 * y Lightbox.tsx usa `drag` — ninguno de los dos funciona con el set más
 * chico. `strict={false}`: si algún componente nuevo importa `motion` sin
 * alias, degrada a cargar su propio bundle completo en vez de tumbar la
 * página — más seguro que un `throw` en producción.
 */
export function LazyMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict={false}>
      {children}
    </LazyMotion>
  );
}
