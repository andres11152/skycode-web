"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  m as motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { DURATION, EASE_OUT, SPRING_SNAPPY } from "@/lib/animations";
import { LightboxZoomContext } from "@/components/ui/lightboxContext";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useOverlayLock } from "@/lib/useOverlayLock";
import {
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  ZOOM_EPSILON,
  clampPan,
  isDoubleTap,
  resolveSwipe,
  wrapIndex,
  zoomAtPoint,
  type Size,
  type Transform,
} from "@/lib/lightboxMath";
import { cn } from "@/lib/utils";

export interface LightboxLabels {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  /** Anuncio para lectores de pantalla ("Imagen {index} de {total}"). */
  position?: string;
}

const DEFAULT_LABELS: LightboxLabels = {
  dialog: "Galería de imágenes",
  close: "Cerrar",
  prev: "Imagen anterior",
  next: "Imagen siguiente",
  zoomIn: "Acercar",
  zoomOut: "Alejar",
  position: "Imagen {index} de {total}",
};

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  slides: ReactNode[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Textos accesibles; por defecto en español. Las páginas en otros idiomas los pasan traducidos. */
  labels?: LightboxLabels;
  /** Texto descriptivo de cada slide, para anunciarlo al cambiar de imagen. */
  captions?: string[];
  /** Se llama con el índice de la imagen anterior y la siguiente para que el padre las precargue. */
  onPreload?: (index: number) => void;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };
const KEY_PAN_STEP = 80;
const TAP_MOVE_TOLERANCE = 6;

const subscribeNoop = () => () => {};

interface Gesture {
  mode: "idle" | "single" | "pinch";
  startX: number;
  startY: number;
  origin: Transform;
  axis: "h" | "v" | null;
  moved: boolean;
  startDist: number;
  startMid: { x: number; y: number };
  lastX: number;
  lastY: number;
  lastT: number;
  vx: number;
  vy: number;
}

const IDLE_GESTURE: Gesture = {
  mode: "idle",
  startX: 0,
  startY: 0,
  origin: IDENTITY,
  axis: null,
  moved: false,
  startDist: 1,
  startMid: { x: 0, y: 0 },
  lastX: 0,
  lastY: 0,
  lastT: 0,
  vx: 0,
  vy: 0,
};

interface SlideMotion {
  direction: 1 | -1;
  reduced: boolean;
}

// Entrada y salida a la vez (sin esperar a que termine la anterior), con un
// desplazamiento corto en la dirección del cambio; la salida dura ~70% de la entrada.
const slideVariants = {
  enter: ({ direction, reduced }: SlideMotion) => ({ opacity: 0, x: reduced ? 0 : direction * 24 }),
  center: ({ reduced }: SlideMotion) => ({
    opacity: 1,
    x: 0,
    transition: { duration: reduced ? 0.01 : 0.22, ease: EASE_OUT },
  }),
  exit: ({ direction, reduced }: SlideMotion) => ({
    opacity: 0,
    x: reduced ? 0 : -direction * 24,
    transition: { duration: reduced ? 0.01 : DURATION.fast, ease: EASE_OUT },
  }),
};

const CONTROL =
  "flex items-center justify-center rounded-full border border-background/20 bg-foreground/85 text-background shadow-lg backdrop-blur-md outline-none transition hover:bg-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground";

/**
 * Visor de imágenes a pantalla completa.
 *  - Cambia de imagen sin esperar a la anterior, con desplazamiento direccional.
 *  - Gestos con Pointer Events: deslizar para cambiar, deslizar hacia abajo para cerrar, pellizcar
 *    para ampliar, doble toque/clic para ampliar hacia el punto tocado, rueda con Ctrl (o pellizco de
 *    trackpad) y paneo con un dedo cuando hay zoom. La matemática vive en `lib/lightboxMath.ts`.
 *  - Teclado: flechas (con zoom, desplazan), Inicio/Fin, +/-/0, Esc. Anuncia "Imagen N de M" y su texto.
 *  - Portal a `<body>` con el resto de la página `inert` y el scroll bloqueado sin que salte.
 */
export function Lightbox({ open, onClose, slides, index, onIndexChange, labels = DEFAULT_LABELS, captions, onPreload }: LightboxProps) {
  const reduced = Boolean(useReducedMotion());
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const total = slides.length;
  const hasMultiple = total > 1;

  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [zoomed, setZoomed] = useState(false);

  // Transformación del contenido (zoom/paneo) y desplazamiento del gesto de deslizar. Valores de
  // movimiento, no estado: se actualizan por frame sin re-renderizar React.
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const swipeX = useMotionValue(0);
  const swipeY = useMotionValue(0);
  const backdropOpacity = useTransform(swipeY, [0, 320], [1, 0.35]);
  useMotionValueEvent(scale, "change", (value) => setZoomed(value > ZOOM_EPSILON));

  const running = useRef<{ stop: () => void }[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>(IDLE_GESTURE);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const stopAnimations = useCallback(() => {
    for (const control of running.current) control.stop();
    running.current = [];
  }, []);

  const applyTransform = useCallback(
    (next: Transform, animated: boolean) => {
      stopAnimations();
      if (!animated || reduced) {
        scale.set(next.scale);
        x.set(next.x);
        y.set(next.y);
        return;
      }
      running.current = [animate(scale, next.scale, SPRING_SNAPPY), animate(x, next.x, SPRING_SNAPPY), animate(y, next.y, SPRING_SNAPPY)];
    },
    [reduced, scale, stopAnimations, x, y],
  );

  const springBack = useCallback(() => {
    if (reduced) {
      swipeX.set(0);
      swipeY.set(0);
      return;
    }
    running.current.push(animate(swipeX, 0, SPRING_SNAPPY), animate(swipeY, 0, SPRING_SNAPPY));
  }, [reduced, swipeX, swipeY]);

  const readTransform = useCallback((): Transform => ({ scale: scale.get(), x: x.get(), y: y.get() }), [scale, x, y]);

  const readSize = useCallback((): Size => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width || 1, height: rect?.height || 1 };
  }, []);

  /** Coordenadas de pantalla -> relativas al CENTRO del lienzo, que es el origen de la transformación. */
  const toCenter = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  }, []);

  const goBy = useCallback(
    (step: 1 | -1) => {
      if (!hasMultiple) return;
      setDirection(step);
      onIndexChange(wrapIndex(index + step, total));
    },
    [hasMultiple, index, onIndexChange, total],
  );

  const goTo = useCallback(
    (target: number) => {
      const next = wrapIndex(target, total);
      if (next === index) return;
      setDirection(next > index ? 1 : -1);
      onIndexChange(next);
    },
    [index, onIndexChange, total],
  );

  const zoomTo = useCallback(
    (nextScale: number, point: { x: number; y: number }, animated: boolean) => {
      applyTransform(zoomAtPoint(readTransform(), nextScale, point, readSize()), animated);
    },
    [applyTransform, readSize, readTransform],
  );

  const toggleZoom = useCallback(
    (point: { x: number; y: number }) => {
      if (scale.get() > ZOOM_EPSILON) applyTransform(IDENTITY, true);
      else zoomTo(DOUBLE_TAP_SCALE, point, true);
    },
    [applyTransform, scale, zoomTo],
  );

  // Cada imagen nueva (o reabrir) empieza sin zoom ni desplazamiento.
  useEffect(() => {
    applyTransform(IDENTITY, false);
    swipeX.set(0);
    swipeY.set(0);
  }, [open, index, applyTransform, swipeX, swipeY]);

  useEffect(() => {
    if (!open || !onPreload || !hasMultiple) return;
    onPreload(wrapIndex(index + 1, total));
    onPreload(wrapIndex(index - 1, total));
  }, [open, index, total, hasMultiple, onPreload]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const isZoomed = scale.get() > ZOOM_EPSILON;
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
        case "ArrowLeft": {
          const step = event.key === "ArrowRight" ? 1 : -1;
          if (isZoomed) {
            const pan = clampPan(x.get() - step * KEY_PAN_STEP, y.get(), scale.get(), readSize());
            applyTransform({ scale: scale.get(), ...pan }, false);
          } else goBy(step);
          break;
        }
        case "ArrowUp":
        case "ArrowDown":
          if (isZoomed) {
            const step = event.key === "ArrowDown" ? 1 : -1;
            const pan = clampPan(x.get(), y.get() - step * KEY_PAN_STEP, scale.get(), readSize());
            applyTransform({ scale: scale.get(), ...pan }, false);
          }
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(total - 1);
          break;
        case "+":
        case "=":
          zoomTo(Math.min(MAX_SCALE, scale.get() * 1.5), { x: 0, y: 0 }, true);
          break;
        case "-":
          zoomTo(scale.get() / 1.5, { x: 0, y: 0 }, true);
          break;
        case "0":
          applyTransform(IDENTITY, true);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, goBy, goTo, total, scale, x, y, readSize, applyTransform, zoomTo]);

  // Rueda: con Ctrl/Cmd (o el pellizco de un trackpad, que llega como Ctrl+rueda) amplía hacia el
  // cursor; con zoom, la rueda desplaza. Debe ser un listener NO pasivo para poder `preventDefault`,
  // y React registra `onWheel` como pasivo, así que va a mano.
  useEffect(() => {
    const stage = stageRef.current;
    if (!open || !stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomTo(scale.get() * Math.exp(-event.deltaY * 0.01), toCenter(event.clientX, event.clientY), false);
      } else if (scale.get() > ZOOM_EPSILON) {
        const pan = clampPan(x.get() - event.deltaX, y.get() - event.deltaY, scale.get(), readSize());
        applyTransform({ scale: scale.get(), ...pan }, false);
      }
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [open, mounted, scale, x, y, readSize, toCenter, zoomTo, applyTransform]);

  const beginSingle = (px: number, py: number, suppressTap: boolean) => {
    gesture.current = {
      ...IDLE_GESTURE,
      mode: "single",
      startX: px,
      startY: py,
      origin: readTransform(),
      moved: suppressTap,
      lastX: px,
      lastY: py,
      lastT: performance.now(),
    };
  };

  const beginPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      ...IDLE_GESTURE,
      mode: "pinch",
      origin: readTransform(),
      moved: true,
      startDist: Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1),
      startMid: toCenter((a.x + b.x) / 2, (a.y + b.y) / 2),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stopAnimations();
    if (pointers.current.size === 1) beginSingle(event.clientX, event.clientY, false);
    else if (pointers.current.size === 2) beginPinch();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;

    if (g.mode === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const size = readSize();
      const zoomedTransform = zoomAtPoint(g.origin, g.origin.scale * (Math.hypot(b.x - a.x, b.y - a.y) / g.startDist), g.startMid, size);
      const mid = toCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      const pan = clampPan(zoomedTransform.x + (mid.x - g.startMid.x), zoomedTransform.y + (mid.y - g.startMid.y), zoomedTransform.scale, size);
      scale.set(zoomedTransform.scale);
      x.set(pan.x);
      y.set(pan.y);
      return;
    }

    if (g.mode !== "single") return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < TAP_MOVE_TOLERANCE) return;
    g.moved = true;

    const now = performance.now();
    const dt = now - g.lastT;
    if (dt > 0) {
      g.vx = (event.clientX - g.lastX) / dt;
      g.vy = (event.clientY - g.lastY) / dt;
    }
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    g.lastT = now;

    if (g.origin.scale > ZOOM_EPSILON) {
      const pan = clampPan(g.origin.x + dx, g.origin.y + dy, g.origin.scale, readSize());
      x.set(pan.x);
      y.set(pan.y);
      return;
    }
    if (!g.axis) g.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    if (g.axis === "h") swipeX.set(hasMultiple ? dx : dx * 0.25);
    else swipeY.set(dy > 0 ? dy : dy * 0.2);
  };

  const finishSingle = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = IDLE_GESTURE;
    const now = performance.now();

    if (g.moved) {
      if (g.origin.scale <= ZOOM_EPSILON && scale.get() <= ZOOM_EPSILON) {
        // Una pausa antes de soltar anula la velocidad acumulada: no es un latigazo.
        const stale = now - g.lastT > 120;
        const intent = resolveSwipe({
          dx: event.clientX - g.startX,
          dy: event.clientY - g.startY,
          vx: stale ? 0 : g.vx,
          vy: stale ? 0 : g.vy,
        });
        if (intent === "next") goBy(1);
        else if (intent === "prev") goBy(-1);
        else if (intent === "close") onClose();
        if (intent !== "close") springBack();
      }
      return;
    }

    const tap = { t: now, x: event.clientX, y: event.clientY };
    if (isDoubleTap(lastTap.current, tap)) {
      lastTap.current = null;
      toggleZoom(toCenter(event.clientX, event.clientY));
    } else {
      lastTap.current = tap;
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (gesture.current.mode === "pinch") {
      if (scale.get() < ZOOM_EPSILON) applyTransform(IDENTITY, true);
      const remaining = [...pointers.current.values()];
      // Si queda un dedo, el pellizco sigue como paneo (sin contarlo como toque).
      if (remaining.length === 1) beginSingle(remaining[0].x, remaining[0].y, true);
      else gesture.current = IDLE_GESTURE;
      return;
    }
    if (gesture.current.mode === "single" && pointers.current.size === 0) finishSingle(event);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = IDLE_GESTURE;
      springBack();
    }
  };

  useOverlayLock(open, overlayRef);
  // Después del lock a propósito (ver `useOverlayLock`).
  useFocusTrap(open, overlayRef);

  const slideMotion = useMemo<SlideMotion>(() => ({ direction, reduced }), [direction, reduced]);
  const announcement = (labels.position ?? DEFAULT_LABELS.position ?? "")
    .replace("{index}", String(index + 1))
    .replace("{total}", String(total))
    .concat(captions?.[index] ? `: ${captions[index]}` : "");

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={labels.dialog}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0.01 : DURATION.fast } }}
          transition={{ duration: reduced ? 0.01 : DURATION.base }}
          // Cierra al pulsar fuera del lienzo (el lienzo y los controles son hijos, no el propio overlay).
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {/* El fondo se atenúa mientras se arrastra hacia abajo para cerrar. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-foreground/95 backdrop-blur-sm"
            style={{ opacity: backdropOpacity }}
          />

          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>

          <button type="button" onClick={onClose} aria-label={labels.close} className={cn(CONTROL, "absolute right-4 top-4 z-20 h-11 w-11")}>
            <X size={20} weight="bold" />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => goBy(-1)}
                aria-label={labels.prev}
                className={cn(CONTROL, "absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 sm:flex")}
              >
                <CaretLeft size={22} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => goBy(1)}
                aria-label={labels.next}
                className={cn(CONTROL, "absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 sm:flex")}
              >
                <CaretRight size={22} weight="bold" />
              </button>
            </>
          )}

          {/* Lienzo de tamaño fijo y grande: cada slide lo llena con `object-contain`, sin letterbox exagerado. */}
          <div className="relative h-[74vh] w-[92vw] max-w-6xl sm:h-[80vh]" onClick={(event) => event.stopPropagation()}>
            <motion.div style={{ x: swipeX, y: swipeY }} className="absolute inset-0">
              <div
                ref={stageRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                className={cn(
                  "absolute inset-0 touch-none select-none overflow-hidden rounded-xl bg-foreground/40",
                  zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
                )}
              >
                <LightboxZoomContext.Provider value={zoomed}>
                  <AnimatePresence initial={false} custom={slideMotion}>
                    <motion.div
                      key={index}
                      custom={slideMotion}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="absolute inset-0"
                    >
                      <motion.div style={{ x, y, scale }} className="h-full w-full will-change-transform">
                        {slides[index]}
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </LightboxZoomContext.Provider>
              </div>
            </motion.div>

            {hasMultiple && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden select-none rounded-full border border-background/20 bg-foreground/85 px-3.5 py-1.5 font-mono text-xs font-medium text-background/90 shadow-lg backdrop-blur-md sm:block">
                {index + 1} / {total}
              </div>
            )}

            {/* En móvil: cápsula inferior con anterior, contador y siguiente. */}
            {hasMultiple && (
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-background/20 bg-foreground/85 p-1 text-background shadow-xl backdrop-blur-md sm:hidden">
                <button
                  type="button"
                  onClick={() => goBy(-1)}
                  aria-label={labels.prev}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-background outline-none transition hover:bg-background/20 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretLeft size={20} weight="bold" />
                </button>
                <div className="select-none px-2 font-mono text-xs font-medium text-background/90">
                  {index + 1} / {total}
                </div>
                <button
                  type="button"
                  onClick={() => goBy(1)}
                  aria-label={labels.next}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-background outline-none transition hover:bg-background/20 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretRight size={20} weight="bold" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleZoom({ x: 0, y: 0 })}
              aria-label={zoomed ? labels.zoomOut : labels.zoomIn}
              className={cn(CONTROL, "absolute bottom-4 right-4 z-20 h-11 w-11")}
            >
              {zoomed ? <MagnifyingGlassMinus size={18} weight="bold" /> : <MagnifyingGlassPlus size={18} weight="bold" />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
