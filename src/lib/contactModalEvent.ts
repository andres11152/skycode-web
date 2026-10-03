/**
 * Apertura programática del modal de contacto (ej. el cotizador, que ya trae
 * un mensaje armado). Los enlaces `#contacto` no lo necesitan: el proveedor
 * los intercepta solo, ver `contactModalTrigger.ts`.
 */
import type { ContactFormPrefill } from "@/components/contact/ContactForm";

export const OPEN_CONTACT_MODAL_EVENT = "skycode:open-contact-modal";

export function openContactModal(prefill?: ContactFormPrefill): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ContactFormPrefill | undefined>(OPEN_CONTACT_MODAL_EVENT, { detail: prefill }));
}
