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

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardOrLogin = pathname === "/dashboard" || pathname === "/login";

  // `html { scroll-behavior: smooth }` (globals.css) hace que el scroll-to-top
  // automático de Next en cada navegación se anime en vez de ser instantáneo —
  // si la página anterior estaba desplazada muy abajo (ej. sección Portafolio),
  // la animación puede no completarse y la nueva página queda abierta a mitad
  // de scroll, a veces directo en el footer. Se fuerza instantáneo solo cuando
  // cambia la ruta (no en anclas dentro de la misma página, que sí deben ser suaves).
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  if (isDashboardOrLogin) {
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
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
