"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m as motion, useMotionValue, useReducedMotion } from "framer-motion";
import { CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface LightboxLabels {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
}

const DEFAULT_LABELS: LightboxLabels = {
  dialog: "Galería de imágenes",
  close: "Cerrar",
  prev: "Imagen anterior",
  next: "Imagen siguiente",
  zoomIn: "Acercar",
  zoomOut: "Alejar",
};

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  slides: React.ReactNode[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Textos accesibles; por defecto en español. Las páginas en otros idiomas los pasan traducidos. */
  labels?: LightboxLabels;
}

// Nivel de zoom fijo (en vez de un slider) — suficiente para leer detalle
// de una captura de pantalla sin la complejidad de pinch-to-zoom real.
const ZOOM_SCALE = 1.8;

export function Lightbox({ open, onClose, slides, index, onIndexChange, labels = DEFAULT_LABELS }: LightboxProps) {
  const reduced = Boolean(useReducedMotion());
  const [zoomed, setZoomed] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const hasMultiple = slides.length > 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

  // Controladas explícitamente (en vez de dejar que `drag` las maneje solo)
  // para poder resetear el paneo a (0,0) al cerrar el zoom o cambiar de
  // slide — sin esto, arrastrar la imagen mientras está ampliada y luego
  // achicarla dejaba el offset del arrastre aplicado sobre la imagen ya en
  // tamaño normal, mostrándola descentrada ("se ve mal" al des-zoomear).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [zoomed, index, x, y]);

  // Los límites de arrastre se calculan del tamaño real del lienzo, no de
  // píxeles fijos — así el paneo se siente correcto sin importar el
  // viewport ni la relación de aspecto de la imagen (antes `{left:-240,
  // right:240, top:-160, bottom:160}` quedaba corto en pantallas grandes y
  // exagerado en móviles).
  useEffect(() => {
    if (!zoomed || !canvasRef.current) {
      setDragConstraints({ left: 0, right: 0, top: 0, bottom: 0 });
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const overflowX = (rect.width * (ZOOM_SCALE - 1)) / 2;
    const overflowY = (rect.height * (ZOOM_SCALE - 1)) / 2;
    setDragConstraints({ left: -overflowX, right: overflowX, top: -overflowY, bottom: overflowY });
  }, [zoomed]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setZoomed(false));

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasMultiple) onIndexChange((index + 1) % slides.length);
      if (e.key === "ArrowLeft" && hasMultiple) onIndexChange((index - 1 + slides.length) % slides.length);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose, index, slides.length, hasMultiple, onIndexChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={labels.dialog}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/95 p-4 backdrop-blur-sm sm:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.2 }}
          onClick={onClose}
        >
          {/* Botón cerrar con fondo oscuro frosted de alto contraste */}
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/85 text-background border border-background/20 backdrop-blur-md shadow-lg outline-none transition-all hover:bg-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <X size={20} weight="bold" />
          </button>

          {/* Flechas laterales para desktop (en mobile pasan a la parte inferior) */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index - 1 + slides.length) % slides.length);
                }}
                aria-label={labels.prev}
                className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-foreground/85 h-11 w-11 text-background shadow-xl backdrop-blur-md border border-background/20 outline-none transition-all hover:bg-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:flex"
              >
                <CaretLeft size={22} weight="bold" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index + 1) % slides.length);
                }}
                aria-label={labels.next}
                className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-foreground/85 h-11 w-11 text-background shadow-xl backdrop-blur-md border border-background/20 outline-none transition-all hover:bg-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:flex"
              >
                <CaretRight size={22} weight="bold" />
              </button>
            </>
          )}

          {/*
            Lienzo de tamaño fijo y grande (no atado a la relación de aspecto
            de cada imagen) — cada slide llena este mismo espacio con
            `object-contain`, así ninguna captura queda con barras de
            letterbox exageradas ni se recorta al ampliar. `overflow-hidden`
            es lo que hace que el paneo (drag) se sienta como una lupa sobre
            la imagen en vez de "la imagen se sale del modal".
          */}
          <div
            ref={canvasRef}
            onClick={(e) => e.stopPropagation()}
            className="relative h-[74vh] w-[92vw] max-w-6xl overflow-hidden rounded-xl bg-foreground/40 sm:h-[80vh]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.01 : 0.15 }}
                className="absolute inset-0"
              >
                <motion.div
                  style={{ x, y }}
                  animate={{ scale: zoomed && !reduced ? ZOOM_SCALE : 1 }}
                  drag={zoomed && !reduced}
                  dragConstraints={dragConstraints}
                  dragElastic={0.1}
                  dragTransition={{ power: 0.2, timeConstant: 200 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onClick={() => setZoomed((value) => !value)}
                  className={cn("h-full w-full touch-none", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
                >
                  {slides[index]}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Contador de slides en desktop (esquina inferior izquierda) */}
            {hasMultiple && (
              <div className="absolute bottom-4 left-4 z-20 hidden rounded-full bg-foreground/85 px-3.5 py-1.5 font-mono text-xs font-medium text-background/90 backdrop-blur-md border border-background/20 shadow-lg select-none sm:block">
                {index + 1} / {slides.length}
              </div>
            )}

            {/* En mobile: cápsula de navegación inferior centrada (flecha prev, contador, flecha next) */}
            {hasMultiple && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground/85 p-1 text-background shadow-xl backdrop-blur-md border border-background/20 sm:hidden"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange((index - 1 + slides.length) % slides.length);
                  }}
                  aria-label={labels.prev}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-background transition-all hover:bg-background/20 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretLeft size={20} weight="bold" />
                </button>

                <div className="px-2 font-mono text-xs font-medium text-background/90 select-none">
                  {index + 1} / {slides.length}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange((index + 1) % slides.length);
                  }}
                  aria-label={labels.next}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-background transition-all hover:bg-background/20 active:scale-90 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CaretRight size={20} weight="bold" />
                </button>
              </div>
            )}

            {/* Botón de zoom de alto contraste */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((value) => !value);
              }}
              aria-label={zoomed ? labels.zoomOut : labels.zoomIn}
              className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/85 text-background border border-background/20 backdrop-blur-md shadow-lg outline-none transition-all hover:bg-foreground hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {zoomed ? <MagnifyingGlassMinus size={18} weight="bold" /> : <MagnifyingGlassPlus size={18} weight="bold" />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
