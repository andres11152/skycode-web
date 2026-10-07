"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Bogotá y los destinos desde los que ya se trabaja o se atiende. Son
// coordenadas geográficas (lat, lon), no copy.
const BOGOTA: [number, number] = [4.711, -74.0721];
const DESTINATIONS: [number, number][] = [
  [40.7128, -74.006], // Nueva York
  [25.7617, -80.1918], // Miami
  [19.4326, -99.1332], // Ciudad de México
  [40.4168, -3.7038], // Madrid
  [48.8566, 2.3522], // París
];

// Color de marca (#0089cd) en el espacio 0–1 que usa cobe.
const BRAND: [number, number, number] = [0, 0.537, 0.804];

// phi en el que Bogotá queda casi de frente (centrada sería ≈6.0, de la proyección de cobe) y el
// vaivén alrededor de ese punto: Bogotá y los arcos siempre quedan a la vista.
const PHI_FRONT = 5.8;
const PHI_SWING = 0.4;

// Espera tras `load` antes de iniciar WebGL (ver el comentario del componente).
const START_DELAY_MS = 2500;

/**
 * Globo WebGL con Bogotá como sede y arcos hacia donde se atiende.
 *
 * - `cobe` (~5 KB) se importa dinámicamente DENTRO del efecto, solo cuando el
 *   globo entra en pantalla y una vez que la página terminó de cargar y está
 *   en reposo (`START_DELAY_MS` + `requestIdleCallback`): iniciar WebGL es una
 *   tarea larga y no debe competir con el LCP ni con la hidratación.
 * - El HTML del servidor ya trae un disco de respaldo; el canvas aparece con un
 *   fundido cuando el globo está listo. Sin WebGL queda el disco.
 * - Con `prefers-reduced-motion` se dibuja un solo cuadro, sin bucle.
 * - El bucle se detiene fuera de pantalla y con la pestaña oculta.
 */
export function BogotaGlobe({ label, className }: { label: string; className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let frame = 0;
    let visible = false;
    let destroy: (() => void) | null = null;
    let update: ((state: { phi: number }) => void) | null = null;
    let started = false;
    let startTimer = 0;
    let idleHandle = 0;

    const tick = (time: number) => {
      if (cancelled || !update) return;
      if (visible && !document.hidden) update({ phi: PHI_FRONT + Math.sin(time / 2600) * PHI_SWING });
      frame = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (started) return;
      started = true;
      try {
        const { default: createGlobe } = await import("cobe");
        if (cancelled) return;
        const size = Math.min(wrapper.clientWidth, 640);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const globe = createGlobe(canvas, {
          devicePixelRatio: dpr,
          width: size * dpr,
          height: size * dpr,
          phi: PHI_FRONT,
          theta: 0.28,
          dark: 0,
          diffuse: 1.25,
          mapSamples: 12000,
          mapBrightness: 5,
          baseColor: [1, 1, 1],
          markerColor: BRAND,
          glowColor: [0.94, 0.96, 0.98],
          markers: [
            { location: BOGOTA, size: 0.09, color: BRAND },
            ...DESTINATIONS.map((location) => ({ location, size: 0.035, color: [0.04, 0.04, 0.04] as [number, number, number] })),
          ],
          arcs: DESTINATIONS.map((to) => ({ from: BOGOTA, to })),
          arcColor: BRAND,
          arcWidth: 0.4,
          arcHeight: 0.3,
          markerElevation: 0.02,
        });
        destroy = globe.destroy;
        update = globe.update;
        setReady(true);
        if (!reduced) frame = requestAnimationFrame(tick);
      } catch {
        // Sin WebGL (o cobe no cargó): queda el disco de respaldo del HTML.
      }
    };

    // Espera a que la página termine de cargar, luego un respiro y un momento de reposo del hilo principal.
    const scheduleStart = () => {
      const run = () => {
        startTimer = window.setTimeout(() => {
          if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(() => void start(), { timeout: 2000 });
          else void start();
        }, START_DELAY_MS);
      };
      if (document.readyState === "complete") run();
      else window.addEventListener("load", run, { once: true });
    };

    let scheduled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible && !scheduled) {
          scheduled = true;
          scheduleStart();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(wrapper);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(startTimer);
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      cancelAnimationFrame(frame);
      destroy?.();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative mx-auto aspect-square w-full max-w-[34rem]", className)}>
      {/* Disco de respaldo: ya está en el HTML del servidor y se ve mientras carga el globo. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-[6%] rounded-full border border-foreground/10 bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#f1f5f9_55%,#e2e8f0_100%)] transition-opacity duration-700 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-700 motion-reduce:transition-none",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
