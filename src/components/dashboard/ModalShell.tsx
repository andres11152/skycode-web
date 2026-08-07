"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";

/**
 * Modal oscuro reutilizable para el panel interno (bg-foreground, no el
 * Modal claro de src/components/ui/ hecho para el sitio público). Usado
 * por TeamTable, CampaignsBoard, ProposalsBoard e InvoicesBoard — mismo
 * patrón de foco/Escape/backdrop en los cuatro, antes duplicado.
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
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidthClassName} rounded-xl border border-background/15 bg-foreground p-6 text-background shadow-2xl outline-none max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 id={titleId} className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-background/60 hover:bg-background/10 hover:text-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
