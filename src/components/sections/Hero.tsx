// Hero — Server Component optimizado para LCP mobile.
//
// Arquitectura de rendimiento:
//  - H1 y P: renderizados como HTML estático puro del servidor sin hydration delay.
//  - CTAs: CSS :hover/:active (globals.css .hero-cta) — cero JS, GPU compositor.
//  - CodeMockup: renderizado en servidor. Antes era `ssr: false` con un
//    esqueleto gris: en 4G lenta el mockup real aparecía segundos después
//    del primer pintado, y Speed Index contaba todo ese tiempo como página
//    visualmente incompleta (4.7s en PageSpeed móvil).

import { Button } from "@/components/ui/Button";
import { GridPattern } from "@/components/ui/GridPattern";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { CodeMockup } from "./CodeMockupClient";
import { getHeroContent } from "@/content/hero";
import { defaultLocale, type Locale } from "@/lib/i18n";

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
        className="[mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,white,transparent)] opacity-95"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-10 xl:gap-16">
        <div className="flex flex-col items-start gap-3 text-left">
          <SectionEyebrow className="mb-2">{heroData.badge}</SectionEyebrow>

          {/*
           * H1 — LCP element principal.
           * Sin animaciones que inicien en opacity: 0 ni delays.
           * Se pinta instantáneamente en el primer frame (FCP = LCP).
           */}
          <h1 className="text-3xl leading-[1.1] font-bold tracking-tight text-balance text-accent sm:text-5xl lg:text-6xl">
            {heroData.title}
          </h1>

          <p className="max-w-xl text-lg font-medium text-foreground/80 sm:text-xl">
            {heroData.subtitle}
          </p>

          {/*
           * CTAs: .hero-cta (globals.css) — CSS :hover/:active transform:scale().
           * Sin motion.div, sin Framer Motion. GPU compositor puro.
           */}
          <div
            role="group"
            aria-label={heroData.actionsAria}
            className="mt-2 flex flex-col gap-4 sm:flex-row"
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
