"use client";

// Hero — optimizado para LCP mobile.
//
// Arquitectura de rendimiento:
//  - H1: <h1> plano con color accent sólido (#0089CD). Sin GradientShimmer,
//    sin -webkit-text-fill-color:transparent. Chrome detecta el texto
//    inmediatamente como LCP candidate desde el primer paint del SSR.
//  - Framer Motion: COMPLETAMENTE eliminado de este archivo. Solo queda en
//    CodeMockupClient que se carga lazy (ssr:false) — no bloquea LCP.
//  - CTAs: CSS :hover/:active (globals.css .hero-cta) — cero JS, GPU compositor.
//  - CodeMockup: lazy-loaded con ssr:false → Framer Motion evalúa DESPUÉS del LCP.

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { GridPattern } from "@/components/ui/GridPattern";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getHeroContent } from "@/content/hero";
import { defaultLocale, type Locale } from "@/lib/i18n";

// Skeleton visible mientras CodeMockup carga — evita layout shift (CLS 0).
// Mismas dimensiones que el CodeMockup real para no causar reflow.
function CodeMockupSkeleton() {
  return (
    <div className="w-full max-w-md select-none" aria-hidden="true">
      <div className="w-full overflow-hidden rounded-xl bg-foreground border border-background/10 shadow-2xl shadow-black/40">
        {/* Cabecera */}
        <div className="flex items-center gap-2 border-b border-background/10 px-3 py-2 sm:px-4 sm:py-2.5 bg-background/20">
          <div className="flex gap-1 sm:gap-1.5">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
          </div>
          <span className="font-mono text-[10px] sm:text-xs text-background/40">
            api/orders/route.ts
          </span>
        </div>
        {/* Líneas de código skeleton */}
        <div className="p-3 sm:p-4 space-y-2">
          {[60, 45, 70, 30, 55, 40, 65, 35].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded bg-background/10"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy-load del CodeMockup: Framer Motion solo se evalúa después de que
// el H1 (LCP element) ya se pintó. En mobile esto ahorra ~400-600ms
// de Script Evaluation antes del primer paint visible.
const CodeMockup = dynamic(
  () => import("./CodeMockupClient").then((m) => ({ default: m.CodeMockup })),
  {
    ssr: false,
    loading: () => <CodeMockupSkeleton />,
  },
);

export function Hero({ locale = defaultLocale }: { locale?: Locale }) {
  const heroData = getHeroContent(locale);

  return (
    <section
      id="inicio"
      aria-label={heroData.sectionAria}
      className="relative overflow-hidden scroll-mt-24 px-6 pt-24 pb-10 sm:pt-28 sm:pb-10 lg:flex lg:flex-1 lg:items-center lg:py-8"
    >
      {/* Resplandor ambiental de acento */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 h-[460px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[100px]"
      />
      <GridPattern
        width={40}
        height={40}
        numSquares={40}
        className="[mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,white,transparent)] opacity-95"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-10 xl:gap-16">
        <div className="flex flex-col items-start gap-3 text-left">
          <SectionEyebrow className="animate-hero-fade-up mb-2">{heroData.badge}</SectionEyebrow>

          {/*
           * H1 — LCP element. Color sólido #0089CD (text-accent), sin gradiente animado.
           *
           * Por qué no usar GradientShimmer aquí:
           *   GradientShimmer aplica post-hydration `-webkit-text-fill-color: transparent`,
           *   lo que hace el texto "invisible" para el algoritmo LCP de Chrome.
           *   Chrome no puede medir texto transparente → LCP Discovery/Breakdown errors.
           *   Color sólido = Chrome lo detecta en el primer paint SSR → LCP perfecto.
           */}
          <h1
            className="animate-hero-fade-up text-3xl leading-[1.1] font-bold tracking-tight text-balance text-accent sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.1s" }}
          >
            {heroData.title}
          </h1>

          <p
            className="animate-hero-fade-up max-w-xl text-lg font-medium text-foreground/80"
            style={{ animationDelay: "0.2s" }}
          >
            {heroData.subtitle}
          </p>

          {/*
           * CTAs: .hero-cta (globals.css) — CSS :hover/:active transform:scale().
           * Sin motion.div, sin Framer Motion. GPU compositor puro.
           */}
          <div
            role="group"
            aria-label={heroData.actionsAria}
            className="animate-hero-fade-up mt-2 flex flex-col gap-4 sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="hero-cta inline-flex">
              <Button
                href={heroData.ctaPrimary.href}
                variant="accent"
                size="lg"
                aria-label={heroData.ctaPrimary.ariaLabel}
              >
                {heroData.ctaPrimary.label}
              </Button>
            </div>

            <div className="hero-cta inline-flex">
              <Button
                href={heroData.ctaSecondary.href}
                variant="secondary"
                size="lg"
                aria-label={heroData.ctaSecondary.ariaLabel}
              >
                {heroData.ctaSecondary.label}
              </Button>
            </div>
          </div>
        </div>

        {/* CodeMockup lazy — Framer Motion no bloquea el LCP del H1 */}
        <div
          aria-hidden="true"
          className="animate-hero-scale-in flex justify-center lg:mt-16 lg:justify-end w-full max-w-full overflow-hidden"
        >
          <CodeMockup locale={locale} />
        </div>
      </div>
    </section>
  );
}
