// Hero — Server Component optimizado para LCP mobile.
//
// Arquitectura de rendimiento:
//  - H1 y P: renderizados como HTML estático puro del servidor sin hydration delay.
//  - CTAs: CSS :hover/:active (globals.css .hero-cta) — cero JS, GPU compositor.
//  - PortalMockup: renderizado en servidor, sin JS. Antes era un editor de
//    código que "escribía solo" (cliente, con temporizadores): un visual
//    genérico de plantilla y JS en la ruta crítica. Ahora es una vista de
//    ejemplo del portal de clientes, el producto real que recibe quien nos
//    contrata.

import Link from "next/link";
import { ArrowRight, MapPin } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { EsBadge } from "@/components/ui/EsBadge";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { PortalMockup } from "./PortalMockup";
import { Tilt } from "@/components/ui/Tilt";
import { getHeroContent } from "@/content/hero";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";

export function Hero({ locale = defaultLocale }: { locale?: Locale }) {
  const heroData = getHeroContent(locale);

  return (
    <section
      id="inicio"
      aria-label={heroData.sectionAria}
      className="relative overflow-hidden scroll-mt-24 px-6 pt-28 pb-16 sm:pt-32 lg:flex lg:flex-1 lg:items-center lg:py-24"
    >
      {/* Grilla fina estática con resplandor de marca. Antes: cuadros que aparecían al azar (JS con
          ResizeObserver), un movimiento más compitiendo con el resto de la página. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(10,10,10,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_65%_35%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="parallax absolute top-0 right-0 -z-10 h-[420px] w-[520px] rounded-full bg-accent/[0.10] blur-[110px]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-10 xl:gap-16">
        {/* min-w-0 en ambas columnas: un ítem de grid tiene `min-width: auto` y, si algo adentro no
            puede achicarse, empuja la columna más ancha que la pista y la sección lo recorta por el
            borde derecho (bug real en móvil). `min-w-0` deja que cada columna respete su ancho. */}
        <div className="flex min-w-0 flex-col items-start gap-4 text-left">
          {/* En móvil se omite: es la tercera línea de texto antes del titular y no aporta al primer pantallazo. */}
          <SectionEyebrow className="mb-1 hidden sm:inline-block">{heroData.badge}</SectionEyebrow>

          {/*
           * H1 — LCP principal. Dos tonos de neutro (negro y gris) en vez de degradado de acento:
           * el énfasis lo da el contraste tonal, y el acento queda para el CTA. Son tres campos de
           * contenido (`titleBefore`/`titleAccent`/`titleAfter`), no una frase partida en runtime.
           */}
          <h1 className="text-3xl leading-[1.12] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl lg:text-6xl">
            <span>{heroData.titleBefore}</span>
            <span className="text-foreground/55">{heroData.titleAccent}</span>
            <span>{heroData.titleAfter}</span>
          </h1>

          {/* Móvil: versión corta (2–3 líneas); desde `sm`, el texto completo. Ambas están en el HTML;
              la oculta usa `display: none`, así que los lectores de pantalla leen solo la visible. */}
          <p className="max-w-xl text-base leading-relaxed text-foreground/80 sm:hidden">{heroData.subtitleShort}</p>
          <p className="hidden max-w-xl text-lg leading-relaxed text-foreground/80 sm:block sm:text-xl sm:leading-relaxed">
            {heroData.subtitle}
          </p>

          {/* CTAs: `.hero-cta` (globals.css), CSS puro — sin Framer Motion. */}
          <div role="group" aria-label={heroData.actionsAria} className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <div className="hero-cta inline-flex w-full sm:w-auto">
              <Button
                href={heroData.ctaPrimary.href}
                variant="accent"
                size="lg"
                className="w-full sm:w-auto"
                aria-label={heroData.ctaPrimary.ariaLabel}
              >
                {heroData.ctaPrimary.label}
              </Button>
            </div>

            <div className="hero-cta inline-flex w-full sm:w-auto">
              <Button
                href={heroData.ctaSecondary.href}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                aria-label={heroData.ctaSecondary.ariaLabel}
              >
                {heroData.ctaSecondary.label}
              </Button>
            </div>
          </div>

          {/* Garantías: solo desde `sm` (en móvil la franja oscura de abajo ya las repite). Texto con separadores finos, sin palomitas dentro de círculos. Viven en
              hero.json (3 idiomas), no en un ternario por locale en el JSX. */}
          <ul className="mt-3 hidden flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80 sm:flex">
            {heroData.guarantees.map((point, index) => (
              <li key={point} className="flex items-center gap-3">
                {index > 0 && <span aria-hidden="true" className="h-3 w-px bg-foreground/20" />}
                {point}
              </li>
            ))}
          </ul>

          {/* Entrada a la página local de Bogotá (solo español: fuera de /, lleva la insignia ES). */}
          <Link
            href={bogotaPagePath}
            className="group -ml-1 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-medium text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <MapPin size={18} weight="regular" aria-hidden="true" />
            <span className="link-underline underline decoration-foreground/25 underline-offset-4">
              {heroData.localLink}
            </span>
            {locale !== "es" && <EsBadge />}
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>

        {/* Solo el panel visual se mueve (inclinación hacia el puntero y desvanecido al salir): el H1
            y el párrafo, que son el LCP, no llevan ninguna animación. */}
        <div className="parallax-exit flex min-w-0 justify-center lg:justify-end">
          <Tilt className="w-full max-w-xl">
            <PortalMockup copy={heroData.portalMockup} />
          </Tilt>
        </div>
      </div>
    </section>
  );
}
