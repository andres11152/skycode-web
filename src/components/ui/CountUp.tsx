"use client";

import { useEffect, useRef } from "react";
import { animate, m as motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

/**
 * Cifra que cuenta desde 0 la primera vez que entra en pantalla (Framer Motion, `transform`-free: solo
 * cambia el texto de un nodo). El HTML del servidor trae ya el valor FINAL: sin JS, para buscadores y
 * con reduced motion se ve el número real, nunca un "0". El lector de pantalla lee el valor fijo
 * (`sr-only`); la versión animada va `aria-hidden` para no anunciar cada paso del conteo.
 */
export function CountUp({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => `${Math.round(latest)}${suffix}`);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    let controls: ReturnType<typeof animate> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        count.set(0);
        controls = animate(count, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
      count.set(value);
    };
  }, [count, reduced, value]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      <motion.span aria-hidden="true" className="tabular-nums">
        {rounded}
      </motion.span>
    </span>
  );
}
