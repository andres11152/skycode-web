"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, closeLabel, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef);
  // Con reduced motion queda solo el fundido: sin escala ni desplazamiento.
  const reduced = useReducedMotion();
  const hiddenPanel = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              "w-full max-w-md rounded-xl border border-foreground/15 bg-background p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl relative overflow-hidden",
              className,
            )}
            initial={hiddenPanel}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={hiddenPanel}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              {title && (
                <h3 id={titleId} className="text-lg font-semibold">
                  {title}
                </h3>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="-mr-1.5 ml-auto flex h-11 w-11 items-center justify-center rounded-full text-foreground/60 outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
