"use client";

import { useEffect } from "react";
import { captureAttributionOnce } from "@/lib/attribution";
import { useConsentRecord } from "@/lib/useConsent";

/**
 * Se monta una sola vez en el layout público (no en /dashboard, /portal ni
 * /login — ahí no hay formularios de captación). Lee los UTMs/referrer de
 * la primera visita y los deja en localStorage para que Contact.tsx los
 * adjunte al enviar, sin importar cuánto navegue antes de convertir.
 *
 * Depende del registro de consentimiento: quien llega desde un anuncio y
 * acepta la categoría de medición DESPUÉS de cargar la página (el caso
 * normal) todavía tiene el `gclid` y los UTM en la URL. Antes el efecto
 * corría solo al montar, sin consentimiento aún, no guardaba nada y no
 * volvía a intentarlo.
 */
export function AttributionCapture() {
  const consent = useConsentRecord();

  useEffect(() => {
    if (!consent) return;
    captureAttributionOnce();
  }, [consent]);

  return null;
}
