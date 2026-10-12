"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GOOGLE_ADS_ID, buildAdsInitScript, updateAdsConsent } from "@/lib/googleAds";
import { isCategoryAllowed } from "@/lib/consent";
import { useConsentRecord } from "@/lib/useConsent";

/**
 * Etiqueta de Google Ads con el Modo de consentimiento v2 de Google. Se carga SIEMPRE en /landing y /gracias,
 * pero con todo el consentimiento en "denied" hasta que la persona acepta la categoría de medición: sin ese
 * permiso no guarda cookies y Google solo recibe datos técnicos básicos de la visita. Con él, puede guardar
 * sus cookies (_gcl_*) y atribuir la conversión al anuncio. Retirar el permiso vuelve a denegarlo.
 * Detalle del orden de los comandos en `buildAdsInitScript`.
 *
 * Solo está en estas dos páginas, no en todo el sitio (148 KB de JS que inflaban el INP de la home). Tiene
 * que estar también donde aterriza el anuncio: ahí es donde la etiqueta guarda el identificador del clic
 * (`gclid`) que luego permite atribuir la conversión de /gracias.
 */
export function GoogleAdsTag() {
  const consent = useConsentRecord();
  const measurement = isCategoryAllowed(consent ?? null, "measurement");

  useEffect(() => {
    // `undefined` = todavía no se leyó el almacenamiento (hidratación): no hay nada que informar.
    if (consent === undefined) return;
    updateAdsConsent(measurement);
  }, [consent, measurement]);

  if (!GOOGLE_ADS_ID) return null;

  return (
    <>
      <Script
        id="google-ads-tag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {buildAdsInitScript(GOOGLE_ADS_ID)}
      </Script>
    </>
  );
}
