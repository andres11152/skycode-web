/**
 * Google Ads: id de la cuenta y envío de conversiones puntuales.
 *
 * La conversión de "formulario enviado" se mide por visita a /gracias (ver
 * ThankYouView). Las demás (hoy, el clic al chat de WhatsApp) se envían como
 * evento desde el navegador con la etiqueta de conversión que se crea en
 * Google Ads; sin esa variable o sin que la etiqueta esté cargada
 * (consentimiento de medición), no se envía nada.
 */
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const GOOGLE_ADS_WHATSAPP_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL;

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

export function reportAdsConversion(label: string | undefined): void {
  if (!GOOGLE_ADS_ID || !label || typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${label}` });
}
