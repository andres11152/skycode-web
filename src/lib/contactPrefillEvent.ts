/**
 * Evento tipado para que `ProjectEstimator` (el cotizador) prellene el
 * formulario de `Contact` sin escribir directo en el DOM de un textarea
 * controlado por React (bug real: `contactTextarea.value = text` cambiaba
 * el DOM pero nunca el estado `message` de React, así que el prefill se
 * veía en pantalla pero se perdía al enviar — el submit lee `message` del
 * estado, no del DOM — y además nunca mandaba ningún `service` real al CRM).
 *
 * Puro, sin `pg` ni nada server-only — lo importan dos client components.
 */
export const CONTACT_PREFILL_EVENT = "skycode:prefill-contact";

export interface ContactPrefillDetail {
  message: string;
  /** Slug de `lib/leadServices.ts`, ya mapeado desde el tipo de proyecto elegido en el cotizador. */
  serviceSlug?: string;
}

export function dispatchContactPrefill(detail: ContactPrefillDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ContactPrefillDetail>(CONTACT_PREFILL_EVENT, { detail }));
}
