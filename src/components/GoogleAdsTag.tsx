"use client";

import Script from "next/script";
import { GOOGLE_ADS_ID } from "@/lib/googleAds";
import { isCategoryAllowed } from "@/lib/consent";
import { useConsentRecord } from "@/lib/useConsent";

/**
 * Etiqueta de Google Ads, solo con el "sí" a la categoría de medición: sin él
 * no se contacta a Google ni se guardan sus cookies (_gcl_*).
 *
 * Se carga en /landing y en /gracias, no en todo el sitio (148 KB de JS que
 * inflaban el INP de la home). Tiene que estar también en la página donde
 * aterriza el anuncio: es ahí donde la etiqueta guarda el identificador del
 * clic (`gclid`) que luego permite atribuir la conversión de /gracias. Con la
 * etiqueta solo en /gracias ese identificador ya no está en la URL y la
 * conversión no puede asignarse a un anuncio.
 */
export function GoogleAdsTag() {
  const consent = useConsentRecord();
  if (!GOOGLE_ADS_ID || !isCategoryAllowed(consent ?? null, "measurement")) return null;

  return (
    <>
      <Script
        id="google-ads-tag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
    </>
  );
}
