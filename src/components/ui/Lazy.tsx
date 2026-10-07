"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Carga diferida de islas cliente bajo el primer pliegue. Hasta que se cumple la condición se
 * muestra `fallback` (que ya viene en el HTML del servidor); al cumplirse se renderiza `children`,
 * y recién entonces el navegador descarga el chunk de un `next/dynamic` y lo hidrata. Así ni el
 * JS ni el trabajo de hidratación de estas secciones compiten con el LCP ni con la primera
 * interacción. Sin `IntersectionObserver` (navegador muy antiguo) se renderiza de inmediato.
 */
export function LazyOnVisible({
  children,
  fallback,
  rootMargin = "600px 0px",
}: {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (ready || !node) return;
    if (typeof IntersectionObserver === "undefined") {
      // Sin IntersectionObserver: se monta en el siguiente turno (no se llama a setState dentro del efecto).
      const id = globalThis.setTimeout(() => setReady(true), 0);
      return () => globalThis.clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return <div ref={ref}>{ready ? children : fallback}</div>;
}

/**
 * Renderiza `children` cuando el navegador está ocioso (o tras `timeout` ms), nunca durante la
 * carga crítica. `minWidth` evita descargar el chunk en pantallas donde el elemento está oculto.
 */
export function LazyOnIdle({
  children,
  timeout = 3000,
  minWidth = 0,
}: {
  children: ReactNode;
  timeout?: number;
  minWidth?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (minWidth > 0 && window.matchMedia(`(min-width: ${minWidth}px)`).matches === false) return;
    const run = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(run, 1500);
    return () => globalThis.clearTimeout(id);
  }, [timeout, minWidth]);

  return ready ? <>{children}</> : null;
}
