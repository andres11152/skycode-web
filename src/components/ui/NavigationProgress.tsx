"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldTrackNavigation } from "@/lib/navigationTrigger";

type Phase = "idle" | "running" | "done";

// Una navegación instantánea (página ya precargada) no debe parpadear una barra: solo se
// muestra si tarda más de esto. Es la misma lógica de los cargadores de GitHub/Vercel.
const SHOW_AFTER_MS = 120;
// Seguro: si el cambio de ruta nunca llega (error de red, navegación cancelada), la barra se retira.
const GIVE_UP_AFTER_MS = 12_000;
const FINISH_MS = 420;

/**
 * Barra de progreso global de 2 px bajo el borde superior, en el acento. Next.js
 * no expone eventos de navegación en el App Router, así que se arma con lo que sí
 * hay: un clic en un enlace interno que cambia de ruta (`shouldTrackNavigation`,
 * puro y con tests) o un atrás/adelante inicia el conteo; el cambio de
 * `usePathname()` lo completa. Solo se ve si la espera supera `SHOW_AFTER_MS`.
 *
 * Es el "cargador" del sitio: en vez de una pantalla de carga que tapa el
 * contenido y retrasa el LCP, retroalimentación fina y proporcional. Los estilos
 * (`.nav-progress`) usan solo `transform`/`opacity`; con reduced motion queda una
 * barra fija sin animación. `aria-hidden`: no es contenido.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const pathnameRef = useRef(pathname);
  const showTimer = useRef<number>(0);
  const giveUpTimer = useRef<number>(0);
  const finishTimer = useRef<number>(0);
  const running = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(giveUpTimer.current);
    };
    const begin = () => {
      window.clearTimeout(finishTimer.current);
      clearTimers();
      running.current = true;
      showTimer.current = window.setTimeout(() => setPhase("running"), SHOW_AFTER_MS);
      giveUpTimer.current = window.setTimeout(() => {
        running.current = false;
        setPhase("idle");
      }, GIVE_UP_AFTER_MS);
    };

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (shouldTrackNavigation(event, anchor, new URL(window.location.href))) begin();
    };
    const onPopState = () => {
      if (window.location.pathname !== pathnameRef.current) begin();
    };

    // Fase de captura: se ve el clic antes de que el router de Next lo consuma.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
      window.clearTimeout(finishTimer.current);
    };
  }, []);

  // El cambio de ruta completa la navegación.
  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    window.clearTimeout(showTimer.current);
    window.clearTimeout(giveUpTimer.current);
    const wasVisible = running.current;
    running.current = false;
    // `setTimeout(…, 0)`: el estado se actualiza desde un callback, no en el cuerpo del efecto.
    window.setTimeout(() => {
      setPhase((current) => (wasVisible && current === "running" ? "done" : "idle"));
    }, 0);
    finishTimer.current = window.setTimeout(() => setPhase("idle"), FINISH_MS);
  }, [pathname]);

  return (
    <div aria-hidden="true" data-phase={phase} className="nav-progress">
      <span />
    </div>
  );
}
