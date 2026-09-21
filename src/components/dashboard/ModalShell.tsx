"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { scaleUp } from "@/lib/animations";

/**
 * Modal del panel interno — mismos tokens claros que src/components/ui/Modal.tsx
 * del sitio público, en un componente separado porque el dashboard no comparte
 * layout con la home. Usado por TeamTable, CampaignsBoard, ProposalsBoard e
 * InvoicesBoard — mismo patrón de foco/Escape/backdrop en los cuatro.
 */
export function ModalShell({
  titleId,
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-md",
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef);
  const reduced = useReducedMotion();
  const variants = scaleUp(reduced ?? false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        ref={dialogRef}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidthClassName} rounded-xl border border-foreground/15 bg-background p-6 text-foreground shadow-2xl outline-none max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 id={titleId} className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
