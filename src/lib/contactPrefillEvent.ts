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

// El evento de arriba solo sirve dentro de la MISMA página (el cotizador y
// el formulario de contacto conviviendo en la home) — desde que el
// cotizador se movió a su propia ruta (/cotizador, ver
// CotizadorPageView.tsx), "revisar con nosotros" implica una navegación de
// verdad a `${home}#contacto`, que destruye el contexto de JS de la página
// actual antes de que cualquier listener del evento llegue a existir. Este
// traspaso vía `sessionStorage` (una sola lectura, se borra al consumirse)
// sobrevive esa navegación; Contact.tsx lo revisa al montarse, además del
// evento en vivo.
const PENDING_KEY = "skycode-pending-contact-prefill";

export function savePendingContactPrefill(detail: ContactPrefillDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(detail));
  } catch {
    // Privacidad estricta del navegador (Safari privado, etc.) — sin
    // sessionStorage, el prefill simplemente no viaja; no es crítico.
  }
}

export function consumePendingContactPrefill(): ContactPrefillDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as ContactPrefillDetail;
  } catch {
    return null;
  }
}
