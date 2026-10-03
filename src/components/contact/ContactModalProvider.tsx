"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "@/components/LocaleProvider";
import { OPEN_CONTACT_MODAL_EVENT } from "@/lib/contactModalEvent";
import { isContactHref, shouldOpenContactModal } from "@/lib/contactModalTrigger";
import type { ContactFormPrefill } from "./ContactForm";

const loadModal = () => import("./ContactModal");
const ContactModal = dynamic(loadModal, { ssr: false });

/**
 * Convierte cualquier enlace a `#contacto` del sitio público en un modal con el
 * mismo formulario, sin que cada CTA tenga que ser un componente cliente.
 *
 * - Delegación de clics en `document` (fase de captura): los CTAs siguen siendo enlaces normales
 *   (sin JS siguen llevando a la sección de la home) y los que viven dentro del
 *   contenido del blog o del FAQ funcionan sin tocarlos.
 * - El chunk del modal se pide al acercarse a un CTA (hover/foco/toque), así el
 *   clic ya lo encuentra cargado y no pesa en la carga inicial de ninguna página.
 * - Abrir añade una entrada al historial (sin cambiar la URL): el botón Atrás o
 *   el gesto de volver en el móvil cierra el modal en vez de salir de la página.
 */
export function ContactModalProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<ContactFormPrefill | undefined>();
  const openRef = useRef(false);

  const show = useCallback((detail?: ContactFormPrefill) => {
    if (openRef.current) return;
    openRef.current = true;
    setPrefill(detail);
    setMounted(true);
    setOpen(true);
    window.history.pushState({ contactModal: true }, "");
  }, []);

  const close = useCallback(() => {
    if (!openRef.current) return;
    if ((window.history.state as { contactModal?: boolean } | null)?.contactModal) {
      window.history.back(); // el handler de popstate cierra
    } else {
      openRef.current = false;
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    function anchorOf(event: Event): HTMLAnchorElement | null {
      const target = event.target;
      return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
    }

    function onClick(event: MouseEvent) {
      const anchor = anchorOf(event);
      if (!anchor || !shouldOpenContactModal(event, anchor)) return;
      // Fase de captura: <Link> de Next maneja el clic en la raíz de React (y llama a
      // preventDefault + router.push) antes de que llegue un listener en burbuja.
      event.preventDefault();
      event.stopPropagation();
      const service = anchor.dataset.contactService;
      show(service ? { serviceSlug: service } : undefined);
    }

    function preload(event: Event) {
      const anchor = anchorOf(event);
      if (anchor && isContactHref(anchor.getAttribute("href"))) void loadModal();
    }

    function onOpenEvent(event: Event) {
      show((event as CustomEvent<ContactFormPrefill | undefined>).detail);
    }

    function onPopState() {
      if (!openRef.current) return;
      openRef.current = false;
      setOpen(false);
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", preload, { passive: true });
    document.addEventListener("focusin", preload);
    window.addEventListener(OPEN_CONTACT_MODAL_EVENT, onOpenEvent);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", preload);
      document.removeEventListener("focusin", preload);
      window.removeEventListener(OPEN_CONTACT_MODAL_EVENT, onOpenEvent);
      window.removeEventListener("popstate", onPopState);
    };
  }, [show]);

  return (
    <>
      {children}
      {mounted && <ContactModal open={open} onClose={close} locale={locale} prefill={prefill} />}
    </>
  );
}
