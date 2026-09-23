import type { Metadata } from "next";
import Image from "next/image";
import { Building2, Code2, ShieldCheck } from "lucide-react";
import { Contact } from "@/components/sections/Contact";
import { siteName } from "@/lib/site";

// Landing dedicada a tráfico de Google Ads (búsqueda, Colombia). Separada de
// la home a propósito: sin Navbar/Footer/WhatsApp ni ningún enlace de salida
// (ver ConditionalLayout.tsx, isCampaignLanding) — la única acción posible en
// la página es enviar el formulario, que es el mismo <Contact /> de la home
// (misma ruta /api/contact, mismo redirect a /gracias) para no romper el
// tracking de conversión ya configurado en Google Ads.
export const metadata: Metadata = {
  title: "Desarrollo de Software, Apps y Páginas Web a la Medida",
  description:
    "Empresa de desarrollo de software en Colombia: aplicaciones móviles, páginas web y sistemas a la medida. Código 100% tuyo, sin intermediarios. Cotiza sin costo.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/landing" },
};

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Garantía de 90 días",
    description: "Ante cualquier falla, sin letra pequeña ni costos ocultos.",
  },
  {
    icon: Code2,
    title: "El código es 100% tuyo",
    description: "Repositorio a tu nombre desde el día 1, sin depender de nosotros.",
  },
  {
    icon: Building2,
    title: "Proyectos reales en producción",
    description:
      "Plataformas como Sentry CRM (SaaS multi-tenant) y ServiFuturo (gestión de flotas) funcionando hoy.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-10 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 h-[460px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[100px]"
      />

      <header className="mx-auto mb-8 flex w-full max-w-6xl items-center sm:mb-10">
        <span aria-label={siteName} className="inline-flex items-center">
          <Image
            src="/logo-mark.png"
            alt={siteName}
            width={110}
            height={63}
            priority
            fetchPriority="high"
            className="h-7 w-auto"
          />
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-6 text-left">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent-strong">
            Empresa de desarrollo de software en Colombia
          </p>

          <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Desarrollo de software, aplicaciones y páginas web a la medida
          </h1>

          <p className="max-w-xl text-lg font-medium text-foreground/80 sm:text-xl">
            Hablas directo con los ingenieros que programan, sin intermediarios comerciales.
            Cuéntanos tu proyecto y te respondemos con una propuesta concreta.
          </p>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-background/80 shadow-lg shadow-black/5 backdrop-blur-sm">
          <Contact locale="es" showOtherContactMethods={false} compact />
        </div>
      </main>

      <section
        aria-label="Por qué trabajar con SkyCode Agency"
        className="mx-auto mt-10 grid w-full max-w-6xl gap-4 sm:mt-16 sm:grid-cols-3 sm:gap-6"
      >
        {trustPoints.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-foreground/10 bg-background/50 p-5 shadow-sm"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-accent/10 text-accent-strong">
              <Icon size={20} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-foreground/70">{description}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto mt-14 w-full max-w-6xl border-t border-foreground/10 pt-6 text-center text-xs text-foreground/60 sm:mt-16">
        <p>
          © {new Date().getFullYear()} {siteName}. Todos los derechos reservados.{" "}
          <a
            href="/politica-privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-accent-strong"
          >
            Política de privacidad
          </a>
        </p>
      </footer>
    </div>
  );
}
