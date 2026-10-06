"use client";

import { Modal } from "@/components/ui/Modal";

/**
 * Diálogo del panel interno. Es un envoltorio fino de `ui/Modal` (el mismo del
 * sitio público) y no una segunda implementación: antes `ModalShell` era una
 * copia más pobre — siempre centrada (también en móvil), sin portal, sin
 * bloqueo del scroll de fondo, sin `inert` y con `max-h` en `vh` (que en iOS
 * queda detrás de la barra del navegador). Ahora hereda hoja inferior en
 * móvil, `dvh`, foco atrapado y fondo inerte.
 *
 * `titleId` se conserva en la firma para no tocar a los consumidores, pero
 * `Modal` genera el suyo.
 */
export function ModalShell({
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-md",
}: {
  titleId?: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  const size = maxWidthClassName === "max-w-md" ? "md" : "lg";
  return (
    <Modal open onClose={onClose} title={title} closeLabel="Cerrar" size={size}>
      {children}
    </Modal>
  );
}
