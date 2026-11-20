import { isCategoryAllowed, readConsentNow } from "@/lib/consent";
import { GA4_ID, GOOGLE_ADS_WHATSAPP_LABEL, getGtag, reportAdsConversion } from "@/lib/googleTag";
import { isPrivateAppPath } from "@/lib/privateRoutes";
import type { Locale } from "@/lib/i18n";

/**
 * Eventos de Google Analytics 4 del sitio público, tipados: cada evento declara sus parámetros y TypeScript
 * rechaza uno mal escrito. Ningún parámetro lleva datos personales (nombre, correo o mensaje de la persona).
 *
 * Reglas:
 *  - `trackEvent` no hace nada sin gtag inicializado, sin `NEXT_PUBLIC_GA4_ID` o sin el permiso de la
 *    categoría "medición" (`skycode-consent`). Nunca lanza: medir no puede romper un formulario ni un enlace.
 *  - Los `page_view` NO pasan por aquí (`trackPageView`): siguen el Modo de consentimiento (sin permiso,
 *    Google recibe un ping sin cookies), igual que el `page_view` de la carga inicial.
 *  - Las rutas privadas (`isPrivateAppPath`) no se miden.
 */

/** Dónde se envió un formulario que crea un lead en el CRM. */
export type FormLocation = "contact_section" | "contact_modal" | "landing" | "estimator_email";

/** Canal del enlace de contacto pulsado. */
export type ContactLinkKind = "whatsapp" | "email" | "phone";

export interface AnalyticsEvents {
  generate_lead: { form_location: FormLocation; lead_source: string };
  whatsapp_click: { link_url: string };
  email_click: { link_url: string };
  phone_click: { link_url: string };
  quote_start: { project_type: string };
  quote_complete: {
    method: "contact_form" | "email";
    project_type: string;
    pace: "standard" | "express";
    addon_count: number;
    currency: "COP" | "USD";
    estimated_value: number;
    estimated_weeks: number;
  };
  thank_you_view: { page_locale: Locale };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

function measurementAllowed(): boolean {
  return isCategoryAllowed(readConsentNow(), "measurement");
}

export function isAnalyticsPath(pathname: string): boolean {
  return !isPrivateAppPath(pathname);
}

export function trackEvent<Name extends AnalyticsEventName>(name: Name, params: AnalyticsEvents[Name]): void {
  if (!GA4_ID) return;
  try {
    const gtag = getGtag();
    if (!gtag || !measurementAllowed() || !isAnalyticsPath(window.location.pathname)) return;
    gtag("event", name, { ...params, send_to: GA4_ID });
  } catch {
    // Almacenamiento bloqueado u otra rareza del navegador: no se mide, y nada más.
  }
}

/**
 * Página actual para TODOS los eventos siguientes (`gtag('set')`, ver el punto 4 de `buildGtagInitScript`).
 * Se llama en cuanto cambia la ruta, sin esperar al título: un evento disparado justo después de navegar ya
 * lleva la URL correcta. No depende del consentimiento: es contexto, no un envío.
 */
export function setPageContext(context: { href: string; referrer: string | null }): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("set", { page_location: context.href, ...(context.referrer ? { page_referrer: context.referrer } : {}) });
}

/**
 * `page_view` de una navegación del App Router (el de la carga inicial lo envía el `config` del script de
 * arranque), ya con el título de la página nueva (ver `waitForDocumentTitle`). Fija el título con `set` para
 * que también lo hereden los eventos siguientes. Solo a GA4: a Google Ads le basta el de la carga del
 * documento. Como el `page_view` inicial, sigue el Modo de consentimiento (sin permiso, ping sin cookies).
 */
export function trackPageView(title: string): void {
  if (!GA4_ID) return;
  const gtag = getGtag();
  if (!gtag || !isAnalyticsPath(window.location.pathname)) return;
  gtag("set", { page_title: title });
  gtag("event", "page_view", { send_to: GA4_ID });
}

/** El `<title>` ya es el de la página nueva: no vacío y distinto del de la página anterior. */
export function isNewDocumentTitle(current: string, previous: string | null): boolean {
  return current.trim() !== "" && current !== previous;
}

/** Tope de espera del título: pasado este tiempo se envía igual (dos páginas pueden compartir título). */
export const TITLE_WAIT_MS = 1500;

/**
 * Llama a `onReady(título)` UNA vez, en cuanto `document.title` es el de la página nueva o al cumplirse el
 * tope. En una navegación de Next 16 el `<title>` se reemplaza durante la transición y, un tick después del
 * cambio de ruta, puede valer "" (bug real: page_view de /servicios con `dt` vacío).
 *
 * Devuelve `flush`, que envía en el acto lo pendiente (si la persona vuelve a navegar antes de que llegue el
 * título, el `page_view` de la página intermedia no se pierde).
 */
export function waitForDocumentTitle(previous: string | null, onReady: (title: string) => void): () => void {
  let done = false;
  const observer = new MutationObserver(() => {
    if (isNewDocumentTitle(document.title, previous)) finish();
  });
  const timer = window.setTimeout(finish, TITLE_WAIT_MS);
  function finish() {
    if (done) return;
    done = true;
    observer.disconnect();
    window.clearTimeout(timer);
    onReady(document.title);
  }
  if (isNewDocumentTitle(document.title, previous)) {
    // Un frame: deja que React termine de aplicar el resto del <head> de la página nueva.
    window.requestAnimationFrame(finish);
  } else {
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  }
  return finish;
}

const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

/**
 * Clasifica el `href` absoluto de un enlace (`anchor.href`) como canal de contacto, con la URL que se reporta:
 * sin la consulta (el `?text=` de WhatsApp o el `?subject=` de un correo pueden traer texto escrito por la
 * persona) y sin datos de quien visita, solo el número o correo de la agencia.
 */
export function classifyContactLink(href: string): { kind: ContactLinkKind; linkUrl: string } | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol === "mailto:") return { kind: "email", linkUrl: `mailto:${url.pathname}` };
  if (url.protocol === "tel:") return { kind: "phone", linkUrl: `tel:${url.pathname}` };
  if ((url.protocol === "https:" || url.protocol === "http:") && WHATSAPP_HOSTS.has(url.hostname)) {
    return { kind: "whatsapp", linkUrl: `${url.origin}${url.pathname}` };
  }
  return null;
}

/**
 * Clic en un enlace de contacto (lo llama la escucha global de `GoogleTag`, así cubre todos los enlaces del
 * sitio, incluidos los que vienen del contenido). WhatsApp envía además la conversión de Google Ads.
 */
export function trackContactLinkClick(href: string): void {
  const link = classifyContactLink(href);
  if (!link) return;
  if (link.kind === "whatsapp") {
    trackEvent("whatsapp_click", { link_url: link.linkUrl });
    try {
      if (measurementAllowed() && isAnalyticsPath(window.location.pathname)) {
        reportAdsConversion(GOOGLE_ADS_WHATSAPP_LABEL);
      }
    } catch {
      // Igual que trackEvent: medir nunca interrumpe el clic.
    }
    return;
  }
  trackEvent(link.kind === "email" ? "email_click" : "phone_click", { link_url: link.linkUrl });
}
