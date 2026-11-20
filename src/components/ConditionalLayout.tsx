"use client";

import { useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer, type FooterServiceLinks } from "@/components/Footer";
import { SkipLink } from "@/components/SkipLink";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { AttributionCapture } from "@/components/AttributionCapture";
import { isPrivateAppPath } from "@/lib/privateRoutes";
import { useLocale } from "@/components/LocaleProvider";
import { ContactModalProvider } from "@/components/contact/ContactModalProvider";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { PageTransition } from "@/components/ui/PageTransition";
import { LazyOnIdle } from "@/components/ui/Lazy";
import FluidFieldBackground from "@/components/ui/fluid-field";

const WhatsAppButton = dynamic(
  () => import("@/components/ui/WhatsAppButton").then((mod) => mod.WhatsAppButton),
  { ssr: false }
);
const MobileActionBar = dynamic(
  () => import("@/components/MobileActionBar").then((mod) => mod.MobileActionBar),
  { ssr: false }
);
const CookieBanner = dynamic(
  () => import("@/components/CookieBanner").then((mod) => mod.CookieBanner),
  { ssr: false }
);


export function ConditionalLayout({ children, serviceLinks }: { children: React.ReactNode; serviceLinks: FooterServiceLinks }) {
  const pathname = usePathname();
  const locale = useLocale();
  // Panel, portal, acceso y enlaces con token (/dashboard/leads, /portal, /invitar/[token],
  // /propuesta/[id]…) quedan sin el Navbar/Footer públicos: cada una ya trae su propio header
  // (DashboardChrome/PortalChrome) o es una pantalla transaccional de página completa (aceptar
  // invitación, ver y responder una propuesta) donde el nav público con su propio CTA solo compite con
  // la acción real de la página. La lista vive en lib/privateRoutes.ts (la comparte la analítica).
  const isAppShell = isPrivateAppPath(pathname);

  // Landing de campaña (Google Ads): sin Navbar/Footer ni enlaces de salida
  // que compitan con el formulario — salvo el botón flotante de WhatsApp
  // (agregado a propósito: tráfico pago que prefiere escribir directo en vez
  // de llenar el formulario no debe quedar sin ninguna salida de contacto).
  // No es un "app shell" (no lleva el fondo oscuro de dashboard/login), solo
  // se queda sin el chrome público normal.
  const isCampaignLanding = pathname === "/landing" || pathname.startsWith("/landing/");

  // `html { scroll-behavior: smooth }` (globals.css) hace que el scroll-to-top
  // automático de Next en cada navegación se anime en vez de ser instantáneo —
  // si la página anterior estaba desplazada muy abajo (ej. sección Portafolio),
  // la animación puede no completarse y la nueva página queda abierta a mitad
  // de scroll, a veces directo en el footer. Se fuerza instantáneo solo cuando
  // cambia la ruta (no en anclas dentro de la misma página, que sí deben ser suaves).
  //
  // Si la navegación entre rutas trae un ancla (ej. "Hablar con un ingeniero"
  // en el blog/portafolio, con href="/#contacto"), este forzado a (0,0) le
  // ganaba la carrera al scroll-to-hash nativo de Next — la página siempre
  // aterrizaba arriba del todo, nunca en la sección real. Bug real, no
  // hipotético. Si hay hash y el elemento existe, se salta el forzado a top.
  // `useLayoutEffect` (no `useEffect`): con la transición de página, el snapshot de la página nueva se
  // captura justo tras el commit — si el scroll se reiniciara después, se vería un salto.
  //
  // En la PRIMERA carga no se reinicia el scroll: el documento ya está arriba (o el navegador restaura su
  // posición) y `window.scrollTo` obliga a calcular estilo y layout justo después de hidratar (la
  // "redistribución forzada" que marca Lighthouse). Solo las navegaciones entre rutas lo necesitan.
  const isFirstRender = useRef(true);
  useLayoutEffect(() => {
    const firstRender = isFirstRender.current;
    isFirstRender.current = false;
    const hash = window.location.hash;
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "instant" });
        return;
      }
    }
    if (!firstRender) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  if (isAppShell) {
    return (
      <main className="min-h-screen flex flex-col bg-foreground text-background">
        {children}
      </main>
    );
  }

  if (isCampaignLanding) {
    // Sin botón flotante de WhatsApp: la landing ya trae sus propios enlaces a WhatsApp (arriba y al
    // cierre, con el clic medido) y un tercer botón fijo tapaba texto del formulario en móvil.
    return (
      <main className="min-h-screen">
        {/* Mismo fondo fluido que el resto del sitio público (claro y oscuro). */}
        <FluidFieldBackground />
        {children}
        {/* Medición: el aviso de cookies y la captura del gclid/UTM (la etiqueta de Google se monta en
            el layout raíz). Sin esto los leads de la campaña llegaban al CRM sin saber de qué anuncio venían. */}
        <AttributionCapture />
        <CookieBanner />
      </main>
    );
  }

  return (
    <ContactModalProvider>
      <FluidFieldBackground />
      <SkipLink />
      <NavigationProgress />
      <Navbar />
      <PageTransition>{children}</PageTransition>
      <Footer serviceLinks={serviceLinks} />
      <HtmlLangSync />
      {/* El botón de WhatsApp, la barra de acción móvil y el banner de cookies no son parte del primer
          pintado: se montan (y sus chunks se descargan) cuando el navegador está ocioso, no durante la
          hidratación. En móvil la barra reemplaza al botón flotante (que se oculta por debajo de `sm`). */}
      <LazyOnIdle timeout={2500}>
        <WhatsAppButton locale={locale} />
        <MobileActionBar locale={locale} />
        <CookieBanner />
      </LazyOnIdle>
      <AttributionCapture />
    </ContactModalProvider>
  );
}
