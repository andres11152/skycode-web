"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

type ModalSize = "sm" | "md" | "lg" | "xl";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Texto de apoyo bajo el título; se enlaza con `aria-describedby`. */
  description?: string;
  descriptionClassName?: string;
  closeLabel: string;
  children: React.ReactNode;
  /** Zona fija al pie (acciones). El contenido de arriba hace scroll sin tapar los botones. */
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Columna lateral (desde `lg`); en móvil se coloca arriba del contenido. */
  aside?: React.ReactNode;
  /** Elemento que recibe el foco al abrir; por defecto, el primero focuseable. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-5xl",
};

const subscribeNoop = () => () => {};

/**
 * Diálogo modal accesible.
 *
 * - Se monta en un portal sobre `<body>`: ya no hereda color ni `overflow` del
 *   contenedor donde se declara (RssSubscribe tenía que parchearlo).
 * - Mientras está abierto, el resto de la página queda `inert`: ni el foco ni
 *   los lectores de pantalla pueden salir al fondo (`aria-modal` solo no lo
 *   garantiza en todos los navegadores).
 * - Bloquea el scroll del fondo compensando el ancho de la barra de
 *   desplazamiento, para que el contenido no "salte" al abrir.
 * - En móvil es una hoja que sube desde abajo con scroll interno
 *   (`max-h` en `dvh`, cabecera y pie fijos); desde `sm` queda centrado.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  descriptionClassName,
  closeLabel,
  children,
  footer,
  size = "md",
  aside,
  initialFocusRef,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  // `onClose` suele llegar como función en línea: leerlo desde una ref evita
  // re-ejecutar el efecto (y reponer el `inert`/scroll lock) en cada render del padre.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    // Todo hermano del overlay pasa a `inert`, salvo scripts y lo que ya lo era.
    const madeInert: Element[] = [];
    for (const child of Array.from(body.children)) {
      if (child === overlayRef.current || child.tagName === "SCRIPT" || child.hasAttribute("inert")) {
        continue;
      }
      child.setAttribute("inert", "");
      madeInert.push(child);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      for (const el of madeInert) el.removeAttribute("inert");
    };
  }, [open]);

  // Va DESPUÉS del efecto de `inert` a propósito: al cerrar, las limpiezas corren
  // en orden de declaración, así que la página deja de ser `inert` ANTES de que
  // el trap devuelva el foco al botón que abrió el diálogo (sobre un elemento
  // inert, `focus()` no hace nada).
  useFocusTrap(open, dialogRef);

  // Con reduced motion queda solo el fundido: sin escala ni desplazamiento.
  const reduced = useReducedMotion();
  const hiddenPanel = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 24 };

  // Declarado después de `useFocusTrap`: su efecto corre después y puede
  // sobrescribir el foco inicial por defecto.
  useEffect(() => {
    if (open && initialFocusRef?.current) initialFocusRef.current.focus();
  }, [open, initialFocusRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          // Cierra solo si el gesto completo (pulsar y soltar) ocurrió sobre el
          // fondo: arrastrar para seleccionar texto y soltar fuera ya no lo cierra.
          onPointerDown={(e) => {
            pressStartedOnBackdrop.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && pressStartedOnBackdrop.current) onClose();
            pressStartedOnBackdrop.current = false;
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "relative flex max-h-[88dvh] w-full flex-col overflow-hidden lg:flex-row rounded-t-xl border border-foreground/10 bg-background text-foreground shadow-2xl shadow-black/30 sm:max-h-[85dvh] sm:rounded-xl",
              SIZE_CLASSES[size],
              className,
            )}
            initial={hiddenPanel}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              ...hiddenPanel,
              transition: { duration: DURATION.fast, ease: EASE_OUT },
            }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            {aside}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Asa decorativa de la hoja móvil. */}
            <span
              aria-hidden="true"
              className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-foreground/15 sm:hidden"
            />
            <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-3 sm:px-8 sm:pt-6">
              <div className="min-w-0 pt-2">
                {title && (
                  <h2 id={titleId} className="text-lg font-semibold tracking-tight text-balance">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className={cn("mt-1.5 text-sm leading-relaxed text-foreground/80", descriptionClassName)}>
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/60 outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6 sm:px-8 sm:pb-8">
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-foreground/10 bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
                {footer}
              </div>
            )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
