import { getAttribution } from "@/lib/attribution";
import type { LandingEventInput } from "@/lib/landingEventSchema";

/**
 * Registra el clic al chat de WhatsApp de una landing de campaña en el contador
 * propio (`POST /api/landing-events`). El evento de GA4 y la conversión de
 * Google Ads los envía la escucha global de `GoogleTag` (lib/analytics.ts),
 * que cubre todos los enlaces de WhatsApp del sitio: enviarlos también aquí
 * contaría dos veces la conversión. Nunca lanza ni bloquea el clic.
 */
export function trackWhatsappClick(landingPage: string): void {
  if (typeof window === "undefined") return;

  // `getAttribution()` devuelve null sin consentimiento de medición, así que
  // sin él solo viaja el tipo de evento y la ruta.
  const attribution = getAttribution();
  const event: LandingEventInput = {
    kind: "whatsapp_click",
    landing_page: landingPage,
    ...(attribution?.utm_source && { utm_source: attribution.utm_source }),
    ...(attribution?.utm_medium && { utm_medium: attribution.utm_medium }),
    ...(attribution?.utm_campaign && { utm_campaign: attribution.utm_campaign }),
    ...(attribution?.utm_term && { utm_term: attribution.utm_term }),
    ...(attribution?.utm_content && { utm_content: attribution.utm_content }),
    ...(attribution?.gclid && { gclid: attribution.gclid }),
  };

  try {
    void fetch("/api/landing-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Sin red o sin fetch: el clic igual sigue su camino.
  }
}
