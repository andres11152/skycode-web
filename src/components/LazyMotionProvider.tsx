"use client";

import { LazyMotion, MotionConfig } from "framer-motion";

/**
 * Las features (`domMax`, ~30 KB gzip) se piden cuando el navegador está ocioso, no en el primer render
 * que usa `m`: compiten con la hidratación y con el primer pintado, y ninguna animación de Motion es
 * necesaria antes (los revelados del sitio son CSS). Mientras no llegan, los `m.*` se ven estáticos en
 * su estado inicial, que ya es el definitivo.
 */
const whenIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") return resolve();
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      events.forEach((name) => window.removeEventListener(name, finish));
      resolve();
    };
    // La primera interacción las pide de inmediato: un modal o el menú no pueden esperar al reposo.
    events.forEach((name) => window.addEventListener(name, finish, { passive: true, once: true }));
    if ("requestIdleCallback" in window) window.requestIdleCallback(finish, { timeout: 3000 });
    else globalThis.setTimeout(finish, 1500);
  });

const loadFeatures = () =>
  whenIdle().then(() => import("@/lib/framerMotionFeatures").then((mod) => mod.default));

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
