"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { GA4_ID, GOOGLE_ADS_ID, buildGtagInitScript, gtagLoaderId, updateGoogleConsent } from "@/lib/googleTag";
import { isAnalyticsPath, setPageContext, trackContactLinkClick, trackPageView, waitForDocumentTitle } from "@/lib/analytics";
import { isCategoryAllowed } from "@/lib/consent";
import { useConsentRecord } from "@/lib/useConsent";

const LOADER_ID = gtagLoaderId({ ga4Id: GA4_ID, adsId: GOOGLE_ADS_ID });

/**
 * Etiqueta de Google (GA4 + Google Ads) con el Modo de consentimiento v2, montada una sola vez en el layout
 * raíz: cubre todas las rutas públicas en los tres idiomas, incluidas /landing y /gracias.
 *
 *  - gtag.js se pide UNA vez (con el id de GA4 o, si no hay, el de Ads) y atiende los dos `config`.
 *  - Todo empieza en "denied" (ver `buildGtagInitScript`): sin permiso de medición no se guardan cookies y
 *    Google solo recibe pings sin cookies. Aceptar o retirar la categoría "medición" envía `consent update`.
 *  - gtag.js se descarga con el navegador ocioso (`lazyOnload`), no durante la hidratación: son ~150 KB que,
 *    cargados antes, subían el INP de la home. Los comandos esperan en `dataLayer` y no se pierden.
 *  - No se carga en las rutas privadas (`isPrivateAppPath`): panel, portal y enlaces con token.
 *  - `page_view`: el de la carga inicial lo envía el `config` de GA4; cada cambio de ruta del App Router lo
 *    envía este componente. Un cambio de ancla (#seccion) o de consulta no cuenta como página nueva.
 *    En GA4, la medición mejorada de "cambios de página por eventos del historial" debe estar APAGADA, o
 *    cada navegación contaría dos veces.
 */
export function GoogleTag() {
  const pathname = usePathname();
  const tracked = isAnalyticsPath(pathname);
  const consent = useConsentRecord();
  // `undefined` = todavía no se leyó el almacenamiento (hidratación): no hay nada que informar.
  const consentKnown = consent !== undefined;
  const measurement = isCategoryAllowed(consent ?? null, "measurement");

  // Depende de dos booleanos y no del registro: `useConsentRecord` devuelve un objeto nuevo en cada render, y
  // cada cambio de ruta reenviaba el mismo `consent update`.
  useEffect(() => {
    if (!consentKnown) return;
    updateGoogleConsent(measurement);
  }, [consentKnown, measurement]);

  // `null`: aún no se midió ninguna página pública (la primera la cubre el `config`). `""`: se pasó por una
  // ruta privada, así que la próxima pública es una página nueva aunque repita la última ruta medida.
  const lastPath = useRef<string | null>(null);
  const lastHref = useRef<string | null>(null);
  const lastTitle = useRef<string | null>(null);
  // `page_view` que espera el título de su página; se vacía (envía) si llega otra navegación antes.
  const pendingPageView = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!LOADER_ID) return;
    if (!tracked) {
      if (lastPath.current !== null) lastPath.current = "";
      return;
    }
    if (lastPath.current === null) {
      lastPath.current = pathname;
      lastHref.current = window.location.href;
      lastTitle.current = document.title;
      return;
    }
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    pendingPageView.current?.();

    // 1) En el acto: URL y referente de la página nueva para TODOS los eventos siguientes.
    const href = window.location.href;
    setPageContext({ href, referrer: lastHref.current });
    lastHref.current = href;

    // 2) El page_view, cuando el <title> ya es el de la página nueva (o al cumplirse el tope).
    // Sin limpieza ligada al efecto a propósito: el modo estricto de React lo desmontaría y volvería a montar
    // en desarrollo, y la segunda pasada ya sale en `lastPath.current === pathname`.
    pendingPageView.current = waitForDocumentTitle(lastTitle.current, (title) => {
      pendingPageView.current = null;
      lastTitle.current = title;
      trackPageView(title);
    });
  }, [pathname, tracked]);

  // Una escucha en fase de captura para TODOS los enlaces de WhatsApp, correo y teléfono del sitio (Navbar,
  // Footer, contacto, modal, Bogotá, landing, /gracias y los enlaces dentro del contenido), presentes o
  // futuros. Captura y no burbuja: `<Link>` de Next y otros manejadores pueden detener la propagación.
  useEffect(() => {
    if (!LOADER_ID) return;
    const onClick = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      trackContactLinkClick(anchor.href);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  if (!LOADER_ID || !tracked) return null;

  return (
    <>
      <Script id="google-tag-init" strategy="afterInteractive">
        {buildGtagInitScript({ ga4Id: GA4_ID, adsId: GOOGLE_ADS_ID })}
      </Script>
      <Script
        id="google-tag"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${LOADER_ID}`}
      />
    </>
  );
}
