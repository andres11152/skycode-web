"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import {
  CodeConsoleWidget,
  MobileAppPreviewWidget,
  ApiInspectorWidget,
  PerformanceMeterWidget,
  SecurityComplianceWidget,
  ArchitectureDocWidget,
  LegacyMigrationWidget,
  AiAppliedWidget,
} from "@/components/services/BentoServiceWidgets";
import { getServicesContent } from "@/content/services";
import { getUiContent } from "@/content/ui";
import { defaultLocale, localeHomePath, t, type Locale } from "@/lib/i18n";

// Con reduced-motion, ningún hover repite en loop ni mueve nada — solo un
// realce sutil de escala/opacidad de una sola pasada.
function buildIconVariantsMap(reduced: boolean): Record<string, Variants> {
  if (reduced) {
    const subtle: Variants = { initial: { opacity: 0.85 }, hover: { opacity: 1 } };
    return {
      "desarrollo-software-medida": subtle,
      "desarrollo-aplicaciones-moviles": subtle,
      "apis-integraciones": subtle,
      "frontend-alto-rendimiento": subtle,
      "seguridad-cumplimiento": subtle,
      "arquitectura-documentacion": subtle,
      "migracion-datos-legacy": subtle,
    };
  }
  return {
    "desarrollo-software-medida": {
      initial: { scale: 1, rotate: 0 },
      hover: { scale: 1.1, rotate: [0, -10, 10, -5, 5, 0], transition: { duration: 0.5 } },
    },
    "desarrollo-aplicaciones-moviles": {
      initial: { scale: 1, rotate: 0 },
      hover: { scale: [1, 0.9, 1.1, 1], rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }
    },
    "apis-integraciones": {
      initial: { scale: 1, rotate: 0 },
      hover: { scale: 1.15, rotate: 45, transition: { type: "spring", stiffness: 300, damping: 15 } },
    },
    "frontend-alto-rendimiento": {
      initial: { y: 0, scale: 1 },
      hover: { y: [-2, 2, -2, 0], scale: 1.1, transition: { duration: 0.6, ease: "easeInOut", repeat: Infinity } },
    },
    "seguridad-cumplimiento": {
      initial: { scale: 1, opacity: 0.8 },
      hover: { scale: [1, 1.2, 1], opacity: 1, transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" } },
    },
    "arquitectura-documentacion": {
      initial: { scale: 1 },
      hover: { scale: 1.15, y: -2, transition: { duration: 0.3, type: "spring", stiffness: 200 } },
    },
    "migracion-datos-legacy": {
      initial: { scale: 1, rotate: 0 },
      hover: { scale: 1.15, rotate: -5, transition: { type: "spring", stiffness: 250, damping: 10 } },
    },
  };
}

const CARD_GAP = 24;
const CARD_WIDTH_MOBILE = 320;
// 360px (no 380px) para que 3 tarjetas completas quepan dentro del contenedor
// max-w-6xl (1152px) de la sección — a 380px solo entraban 2 tarjetas enteras
// y el resto del ancho (~370px) quedaba vacío en cualquier escritorio ≥1200px,
// ya que el contenedor nunca muestra una tarjeta a medias (ver el cálculo de
// visibleWidth más abajo).
const CARD_WIDTH_DESKTOP = 360;
const MOBILE_BREAKPOINT = 640;

function getCardWidth() {
  return (window.innerWidth < MOBILE_BREAKPOINT ? CARD_WIDTH_MOBILE : CARD_WIDTH_DESKTOP) + CARD_GAP;
}

const listVariants: Variants = {
  initial: {},
  hover: {
    transition: {
      staggerChildren: 0.04
    }
  }
};

function buildListItemVariants(reduced: boolean): Variants {
  return {
    initial: { x: 0 },
    hover: reduced
      ? { x: 0 }
      : { x: 6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
  };
}

function buildBulletVariants(reduced: boolean): Variants {
  return {
    initial: { width: 6, backgroundColor: "rgba(10, 10, 10, 0.25)" },
    hover: {
      width: reduced ? 6 : 14,
      backgroundColor: "var(--accent)",
      transition: reduced ? { duration: 0.15 } : { type: "spring" as const, stiffness: 300, damping: 15 },
    },
  };
}

export function Services({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const iconVariantsMap = buildIconVariantsMap(reduced);
  const listItemVariants = buildListItemVariants(reduced);
  const bulletVariants = buildBulletVariants(reduced);
  const { services, servicesSection } = getServicesContent(locale);
  const uiData = getUiContent(locale);
  const homePath = localeHomePath(locale);
  const servicesPrefix = homePath === "/" ? "" : homePath;
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleWidth, setVisibleWidth] = useState<number | null>(null);

  // En vez de disimular la tarjeta parcial con un fade (no se ve bien con títulos largos:
  // el corte cae sobre el texto, no solo el padding), el contenedor visible se recorta a un
  // múltiplo exacto de (ancho de tarjeta + gap) — así nunca se muestra una tarjeta a medias,
  // ni al inicio, en medio ni al final del carrusel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const available = entry.contentRect.width;
      const unit = getCardWidth();
      const wholeCards = Math.max(1, Math.floor((available + CARD_GAP) / unit));
      setVisibleWidth(wholeCards * unit - CARD_GAP);
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);

    const index = Math.round(scrollLeft / getCardWidth());
    setCurrentIndex(Math.min(services.length - 1, Math.max(0, index)));
  }, [services.length]);

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", checkScroll, { passive: true });
      const rafId = requestAnimationFrame(() => {
        checkScroll();
      });
      return () => {
        cancelAnimationFrame(rafId);
        ref.removeEventListener("scroll", checkScroll);
      };
    }
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft } = scrollRef.current;
    const cardWidth = getCardWidth();
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;

    scrollRef.current.scrollTo({
      left: scrollLeft + scrollAmount,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const scrollToTab = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: index * getCardWidth(),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section id="servicios" className="scroll-mt-24 bg-foreground px-6 py-20 sm:py-24 lg:py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow onDark className="mb-3">{servicesSection.badge}</SectionEyebrow>
            <h2 className="text-4xl font-bold tracking-tight text-background sm:text-5xl">
              {servicesSection.title}
            </h2>
            <p className="mt-3 text-background/80">
              {servicesSection.description}
            </p>
          </div>

          {/* Botones de navegación del carrusel */}
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20 bg-background/5 text-background transition-all duration-200 hover:bg-background/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={uiData.servicesScrollPrev}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20 bg-background/5 text-background transition-all duration-200 hover:bg-background/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={uiData.servicesScrollNext}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Contenedor del Carrusel — enfocable con teclado, flechas izq/der lo desplazan */}
        <div className="relative" ref={containerRef}>
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label={servicesSection.title}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                scroll("right");
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                scroll("left");
              }
            }}
            className="flex gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-6 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded-xl"
            style={{ scrollbarWidth: "none", width: visibleWidth ? `${visibleWidth}px` : undefined }}
          >
            {services.map((service) => {
              const iconVariants = iconVariantsMap[service.slug] || { hover: { scale: 1.1 } };
              return (
                <motion.div
                  key={service.slug}
                  initial="initial"
                  whileHover="hover"
                  className="w-[320px] sm:w-[360px] shrink-0 snap-start h-full"
                >
                  <SpotlightCard className="h-full">
                    <Link
                      href={`${servicesPrefix}/servicios/${service.slug}`}
                      aria-labelledby={`service-title-${service.slug}`}
                      className="group flex min-h-[460px] sm:min-h-[450px] h-full flex-col justify-between rounded-xl border border-foreground/10 bg-background p-6 sm:p-8 outline-none transition-all duration-300 hover:border-accent/30 hover:shadow-[0_12px_40px_rgba(0,137,205,0.04)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                    >
                      <div>
                        <div className="mb-4 flex items-center gap-3">
                          {/* Contenedor del icono con borde vidriado y brillo radial en hover */}
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-foreground/5 to-foreground/[0.01] border border-foreground/10 text-foreground/60 transition-all duration-300 group-hover:from-accent/15 group-hover:to-accent/5 group-hover:border-accent/30 group-hover:text-accent group-hover:shadow-[0_0_20px_rgba(0,137,205,0.15)]">
                            <motion.span variants={iconVariants} className="flex items-center justify-center">
                              <service.coverIcon size={22} strokeWidth={1.75} aria-hidden="true" />
                            </motion.span>
                          </div>
                          <h3 id={`service-title-${service.slug}`} className="text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
                            {service.title}
                          </h3>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed mb-4">{service.description}</p>

                        {/* Interactive Bento 2.0 Widget */}
                        <div className="my-3">
                          {service.slug === "desarrollo-software-medida" && <CodeConsoleWidget />}
                          {service.slug === "desarrollo-aplicaciones-moviles" && <MobileAppPreviewWidget />}
                          {service.slug === "apis-integraciones" && <ApiInspectorWidget />}
                          {service.slug === "frontend-alto-rendimiento" && <PerformanceMeterWidget />}
                          {service.slug === "seguridad-cumplimiento" && <SecurityComplianceWidget />}
                          {service.slug === "arquitectura-documentacion" && <ArchitectureDocWidget />}
                          {service.slug === "migracion-datos-legacy" && <LegacyMigrationWidget />}
                          {service.slug === "inteligencia-artificial-aplicada" && <AiAppliedWidget />}
                        </div>
                      </div>
                      {/* Listado con efecto Staggered al hacer hover en la tarjeta */}
                      <motion.ul
                        variants={listVariants}
                        className="mt-6 flex flex-col gap-2.5 border-t border-foreground/5 pt-5"
                      >
                        {service.features.map((feature) => (
                          <motion.li
                            key={feature}
                            variants={listItemVariants}
                            className="flex items-start gap-3 text-sm text-foreground/85"
                          >
                            <motion.span
                              variants={bulletVariants}
                              className="mt-2 h-1.5 rounded-full shrink-0"
                            />
                            <span>{feature}</span>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </Link>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Paginación elástica tipo Píldora */}
        <div className="mt-6 flex justify-center gap-2">
          {services.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToTab(index)}
              className="group flex h-6 w-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              aria-label={t(uiData.servicesGoToSlide, { index: String(index + 1) })}
            >
              <motion.div
                animate={{
                  width: currentIndex === index ? 24 : 8,
                  backgroundColor: currentIndex === index ? "var(--accent)" : "rgba(255, 255, 255, 0.25)"
                }}
                transition={reduced ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 30 }}
                className="h-2 rounded-full transition-colors group-hover:bg-background/40"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
