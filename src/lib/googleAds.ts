import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "@/lib/consent";

/**
 * Google Ads: id de la cuenta, Modo de consentimiento v2 y envío de conversiones puntuales.
 *
 * La conversión de "formulario enviado" se mide por visita a /gracias (ver ThankYouView). Las demás (hoy, el
 * clic al chat de WhatsApp) se envían como evento desde el navegador con la etiqueta de conversión que se
 * crea en Google Ads; sin esa variable o sin que la etiqueta esté cargada, no se envía nada.
 */
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const GOOGLE_ADS_WHATSAPP_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL;

/** Marca en `window` que pone el script de arranque cuando ya dejó el consentimiento por defecto. */
export const ADS_READY_FLAG = "__skycodeAdsReady";

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

export function reportAdsConversion(label: string | undefined): void {
  if (!GOOGLE_ADS_ID || !label || typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${label}` });
}

/**
 * Estado de consentimiento que se le comunica a Google según la categoría "medición" del sitio. Solo
 * publicidad: `analytics_storage` queda siempre denegado porque este sitio no usa analítica.
 */
export function adsConsentState(measurement: boolean) {
  const value = measurement ? "granted" : "denied";
  return { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: "denied" } as const;
}

/**
 * Script de arranque de la etiqueta (Modo de consentimiento v2):
 *  1. Todo en "denied" ANTES de configurar la cuenta: sin permiso de medición la etiqueta no guarda cookies y
 *     solo envía a Google pings sin cookies (dirección IP, navegador y página).
 *  2. `ads_data_redaction`: mientras `ad_storage` esté denegado, Google borra de las peticiones los
 *     identificadores de clic de anuncios.
 *  3. Si la persona ya había aceptado la medición (registro vigente en `localStorage`), se aplica en el mismo
 *     script, en orden: un `update` encolado antes del `default` sería ignorado.
 * Los cambios posteriores (aceptar o rechazar desde el banner) los envía `GoogleAdsTag` con `consent update`.
 */
export function buildAdsInitScript(adsId: string): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    gtag('set', 'ads_data_redaction', true);
    try {
      var stored = JSON.parse(window.localStorage.getItem('${CONSENT_STORAGE_KEY}') || 'null');
      if (stored && stored.version === ${CONSENT_VERSION} && stored.measurement === true) {
        gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
      }
    } catch (error) {}
    gtag('js', new Date());
    gtag('config', ${JSON.stringify(adsId)});
    window.${ADS_READY_FLAG} = true;
  `;
}

type AdsWindow = Window & { dataLayer?: unknown[]; [ADS_READY_FLAG]?: boolean };

/** Envía `consent update` si el script de arranque ya corrió; si no, él mismo leerá el estado guardado. */
export function updateAdsConsent(measurement: boolean): void {
  if (typeof window === "undefined") return;
  const adsWindow = window as AdsWindow;
  if (!adsWindow[ADS_READY_FLAG]) return;
  // gtag.js solo reconoce los comandos encolados como objeto `arguments`, no como arreglo.
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("consent", "update", adsConsentState(measurement));
}
