"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  slides: React.ReactNode[];
  index: number;
  onIndexChange: (index: number) => void;
}

export function Lightbox({ open, onClose, slides, index, onIndexChange }: LightboxProps) {
  const reduced = Boolean(useReducedMotion());
  const [zoomed, setZoomed] = useState(false);
  const hasMultiple = slides.length > 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

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
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
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
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:left-4"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index + 1) % slides.length);
                }}
                aria-label="Imagen siguiente"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-background/70 outline-none transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground sm:right-4"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <motion.div
            key={index}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
            transition={{ duration: reduced ? 0.01 : 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl"
          >
            <motion.div
              animate={{ scale: zoomed && !reduced ? 1.7 : 1 }}
              drag={zoomed && !reduced}
              dragConstraints={{ left: -240, right: 240, top: -160, bottom: 160 }}
              dragElastic={0.15}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={() => setZoomed((value) => !value)}
              className={cn("touch-none", zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
            >
              {slides[index]}
            </motion.div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((value) => !value);
              }}
              aria-label={zoomed ? "Alejar" : "Acercar"}
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/10 text-background outline-none backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>
          </motion.div>

          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/10 px-3 py-1 font-mono text-xs text-background/80 backdrop-blur-sm">
              {index + 1} / {slides.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
