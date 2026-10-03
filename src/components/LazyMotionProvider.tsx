"use client";

import { LazyMotion, MotionConfig } from "framer-motion";

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
 *
 * `MotionConfig reducedMotion="user"`: red de seguridad global para
 * `prefers-reduced-motion`. Con la preferencia activa, Motion desactiva por
 * sí mismo las animaciones de transform y layout (deja los fundidos de
 * opacidad) en TODO componente, incluidos los que no leen
 * `useReducedMotion()` a mano (ej. BentoServiceWidgets). No reemplaza la
 * regla de leerlo explícitamente — eso sigue siendo necesario para quitar
 * espacio de scroll, timers o efectos que no son animaciones de Motion.
 */
export function LazyMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict={false}>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
