"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m as motion, useMotionValue, useReducedMotion } from "framer-motion";
import { CaretLeft, CaretRight, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  slides: React.ReactNode[];
  index: number;
  onIndexChange: (index: number) => void;
}

// Nivel de zoom fijo (en vez de un slider) — suficiente para leer detalle
// de una captura de pantalla sin la complejidad de pinch-to-zoom real.
const ZOOM_SCALE = 1.8;

export function Lightbox({ open, onClose, slides, index, onIndexChange }: LightboxProps) {
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
          aria-label="Galería de imágenes"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/95 p-4 backdrop-blur-sm sm:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.2 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <X size={20} />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index - 1 + slides.length) % slides.length);
                }}
                aria-label="Imagen anterior"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:left-4"
              >
                <CaretLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index + 1) % slides.length);
                }}
                aria-label="Imagen siguiente"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:right-4"
              >
                <CaretRight size={22} />
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
            className="relative h-[80vh] w-[92vw] max-w-6xl overflow-hidden rounded-xl bg-foreground/40"
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

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((value) => !value);
              }}
              aria-label={zoomed ? "Alejar" : "Acercar"}
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/10 text-background outline-none backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {zoomed ? <MagnifyingGlassMinus size={18} /> : <MagnifyingGlassPlus size={18} />}
            </button>

            {hasMultiple && (
              <div className="absolute bottom-4 left-4 rounded-full bg-background/10 px-3 py-1 font-mono text-xs text-background/80 backdrop-blur-sm">
                {index + 1} / {slides.length}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
