"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";
import { SkipLink } from "@/components/SkipLink";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { AttributionCapture } from "@/components/AttributionCapture";
import { useLocale } from "@/components/LocaleProvider";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  // `startsWith`, no igualdad exacta: /dashboard, /portal, /invitar y
  // /propuesta tienen subrutas propias (/dashboard/leads,
  // /dashboard/equipo, /portal, /invitar/[token], /propuesta/[id]) que
  // también deben quedar sin el Navbar/Footer públicos — cada una ya trae
  // su propio header (DashboardChrome/PortalChrome) o es una pantalla
  // transaccional de página completa (aceptar invitación, ver y responder
  // una propuesta) donde el nav público con su propio CTA de "Cotizar
  // Proyecto" solo compite con la acción real de la página.
  const isAppShell =
    pathname === "/login" ||
    pathname === "/olvide-password" ||
    pathname.startsWith("/resetear-password") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/invitar") ||
    pathname.startsWith("/propuesta");

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
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "instant" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  if (isAppShell) {
    return (
      <main className="min-h-screen flex flex-col bg-foreground text-background">
        {children}
      </main>
    );
  }

  return (
    <>
      <SkipLink />
      <Navbar />
      {children}
      <Footer />
      <HtmlLangSync />
      <CustomCursor />
      <WhatsAppButton locale={locale} />
      <CookieBanner />
      <AttributionCapture />
    </>
  );
}
