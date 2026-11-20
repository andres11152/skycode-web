import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "@/lib/consent";

/**
 * Etiqueta de Google (gtag.js) del sitio: UNA sola carga del script para Google Analytics 4 y Google Ads,
 * con el Modo de consentimiento v2. Módulo puro (sin React): el componente que la monta es `GoogleTag`.
 *
 * La conversión de Ads "formulario enviado" se mide por la carga de /gracias (acción de Google Ads de tipo
 * carga de página). Las demás (clic al chat de WhatsApp) se envían como evento con la etiqueta de conversión
 * que se crea en Google Ads; sin esa variable no se envía nada.
 *
 * Los IDs son `NEXT_PUBLIC_*`: Next los incrusta en el JavaScript AL COMPILAR, así que tienen que existir en
 * el entorno del build (no basta con definirlos en tiempo de ejecución).
 */
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || undefined;
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || undefined;
export const GOOGLE_ADS_WHATSAPP_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || undefined;

/** Marca en `window` que pone el script de arranque cuando ya dejó el consentimiento por defecto. */
export const GTAG_READY_FLAG = "__skycodeGtagReady";

type ConsentValue = "granted" | "denied";

export interface GoogleConsentState {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
}

type GtagFunction = (...args: unknown[]) => void;
type GtagWindow = Window & { gtag?: GtagFunction; [GTAG_READY_FLAG]?: boolean };

/**
 * Estado de consentimiento que se le comunica a Google según la categoría "medición" del sitio. Una sola
 * categoría gobierna las cuatro señales: el sitio no ofrece aceptar la analítica sin la publicidad ni al revés.
 */
export function googleConsentState(measurement: boolean): GoogleConsentState {
  const value: ConsentValue = measurement ? "granted" : "denied";
  return { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value };
}

/**
 * `gtag` ya inicializado (con el consentimiento por defecto aplicado), o `null`. Antes de la marca de
 * arranque cualquier comando quedaría delante del `consent default` y Google lo trataría sin consentimiento.
 */
export function getGtag(): GtagFunction | null {
  if (typeof window === "undefined") return null;
  const gtagWindow = window as GtagWindow;
  if (!gtagWindow[GTAG_READY_FLAG] || typeof gtagWindow.gtag !== "function") return null;
  return gtagWindow.gtag;
}

/** Id con el que se pide gtag.js: basta uno, el script atiende después a todos los `config`. */
export function gtagLoaderId(ids: { ga4Id?: string; adsId?: string }): string | undefined {
  return ids.ga4Id ?? ids.adsId;
}

/**
 * Script de arranque (Modo de consentimiento v2). Corre antes de que llegue gtag.js: los comandos quedan en
 * `dataLayer` y el script los procesa en orden al cargar.
 *  1. Todo en "denied" ANTES de configurar las cuentas, con `wait_for_update`: sin permiso de medición no se
 *     guardan cookies y Google solo recibe pings sin cookies (dirección IP, navegador y página).
 *  2. `ads_data_redaction`: mientras `ad_storage` esté denegado, Google borra de las peticiones los
 *     identificadores de clic de anuncios.
 *  3. Si la persona ya había aceptado la medición (registro vigente en `localStorage`), se aplica en el mismo
 *     script, en orden: un `update` encolado antes del `default` sería ignorado.
 *  4. GA4 envía el `page_view` de la carga inicial con su `config`; las navegaciones del App Router las envía
 *     `GoogleTag` (ver `trackPageView`). `page_location` va explícito porque gtag.js se descarga con el
 *     navegador ocioso y, si la persona ya cambió de ruta, leería la URL nueva.
 * Los cambios posteriores (aceptar o rechazar desde el banner) los envía `updateGoogleConsent`.
 */
export function buildGtagInitScript(ids: { ga4Id?: string; adsId?: string }): string {
  const granted = JSON.stringify(googleConsentState(true));
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
    gtag('set', 'ads_data_redaction', true);
    try {
      var stored = JSON.parse(window.localStorage.getItem('${CONSENT_STORAGE_KEY}') || 'null');
      if (stored && stored.version === ${CONSENT_VERSION} && stored.measurement === true) {
        gtag('consent', 'update', ${granted});
      }
    } catch (error) {}
    gtag('js', new Date());
    ${ids.ga4Id ? `gtag('config', ${JSON.stringify(ids.ga4Id)}, { page_location: window.location.href, page_title: document.title });` : ""}
    ${ids.adsId ? `gtag('config', ${JSON.stringify(ids.adsId)});` : ""}
    window.${GTAG_READY_FLAG} = true;
  `;
}

/** Envía `consent update` si el script de arranque ya corrió; si no, él mismo leerá el estado guardado. */
export function updateGoogleConsent(measurement: boolean): void {
  getGtag()?.("consent", "update", googleConsentState(measurement));
}

/**
 * Conversión puntual de Google Ads (`send_to: AW-…/etiqueta`). La decisión de si hay consentimiento la toma
 * quien llama (`lib/analytics.ts`), no esta función.
 */
export function reportAdsConversion(label: string | undefined): void {
  if (!GOOGLE_ADS_ID || !label) return;
  getGtag()?.("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${label}` });
}
