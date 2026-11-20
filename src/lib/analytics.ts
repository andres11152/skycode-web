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
 * `page_view` de una navegación del App Router (la de la carga inicial la envía el `config` del script de
 * arranque). Solo a GA4: a Google Ads le basta el de la carga del documento.
 */
export function trackPageView(previousHref: string | null): void {
  if (!GA4_ID) return;
  const gtag = getGtag();
  if (!gtag || !isAnalyticsPath(window.location.pathname)) return;
  gtag("event", "page_view", {
    send_to: GA4_ID,
    page_location: window.location.href,
    page_title: document.title,
    ...(previousHref ? { page_referrer: previousHref } : {}),
  });
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
