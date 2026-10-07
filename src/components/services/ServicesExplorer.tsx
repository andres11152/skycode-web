"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { ServiceDemoSkeleton } from "@/components/services/ServiceDemoSkeleton";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { getServicesContent } from "@/content/services";
import { DURATION, EASE_OUT, SPRING_SNAPPY } from "@/lib/animations";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Las 9 demos viven en un solo módulo (BentoServiceWidgets, ~650 líneas):
// se cargan diferidas y solo en desktop. Antes el índice montaba las 9 a la
// vez dentro de cada tarjeta — 9 demos compitiendo por atención y todo ese
// JS en la primera carga, también en móvil.
const ServiceDemo = dynamic(() => import("@/components/services/ServiceDemo"), {
  ssr: false,
  loading: () => <ServiceDemoSkeleton />,
});

/**
 * Índice editorial de servicios: lista numerada a la izquierda (cada fila
 * es un `<Link>` real al detalle — funciona sin JS y con Tab) y, en
 * desktop, un panel sticky que muestra la demo del servicio activo. El
 * activo sigue al hover y al foco, con un fondo compartido (`layoutId`) que
 * se desliza entre filas, igual que la píldora del Navbar.
 *
 * Los textos llegan por prop desde el servidor en vez de importar
 * `content/servicePage`: ese JSON trae la FAQ del índice en 3 idiomas, y
 * importarlo aquí lo mandaría entero al navegador.
 */
export function ServicesExplorer({
  locale,
  copy,
  headingLevel = "h2",
}: {
  locale: Locale;
  copy: { listAria: string; previewLabel: string; openService: string };
  /** Nivel del título de cada fila: `h3` cuando el índice vive bajo el `h2` de otra sección (home). */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const reduced = Boolean(useReducedMotion());
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { services } = getServicesContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  const [activeSlug, setActiveSlug] = useState(services[0]?.slug ?? "");
  const active = services.find((service) => service.slug === activeSlug) ?? services[0];

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
      <ol aria-label={copy.listAria} className="border-t border-foreground/10">
        {services.map((service, index) => {
          const isActive = isDesktop && service.slug === active?.slug;
          const href = `${prefix}/servicios/${service.slug}`;

          return (
            <li key={service.slug} className="scroll-reveal relative border-b border-foreground/10">
              {isActive && (
                <motion.span
                  layoutId="services-index-active"
                  aria-hidden="true"
                  className="absolute inset-x-0 inset-y-1 -z-10 rounded-xl bg-foreground/[0.04]"
                  transition={SPRING_SNAPPY}
                />
              )}
              <Link
                href={href}
                onMouseEnter={() => setActiveSlug(service.slug)}
                onFocus={() => setActiveSlug(service.slug)}
                className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-4 rounded-xl px-2 py-6 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-4 sm:py-7"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pt-1 font-mono text-sm font-medium text-foreground/60 transition-colors duration-200 sm:pt-0",
                    isActive && "text-accent-strong",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="min-w-0">
                  <Heading className="text-lg font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
                    {service.title}
                  </Heading>
                  <span className="mt-1.5 block max-w-xl text-sm leading-relaxed text-foreground/80 line-clamp-2">
                    {service.description}
                  </span>
                </span>

                <ArrowUpRight
                  size={20}
                  aria-hidden="true"
                  className={cn(
                    "mt-1 shrink-0 text-foreground/60 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-strong motion-reduce:transform-none sm:mt-0",
                    isActive && "text-accent-strong",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ol>

      {isDesktop && active && (
        <aside aria-label={copy.previewLabel} className="hidden lg:block">
          <div className="sticky top-28">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: reduced ? 0 : -6, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
                className="flex flex-col gap-5 rounded-xl border border-foreground/10 bg-background p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                    {copy.previewLabel}
                  </p>
                  <span className="font-mono text-xs text-foreground/60">
                    {String(services.indexOf(active) + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}
                  </span>
                </div>

                <MorphTransition name={`service-demo-${active.slug}`}>
                  <div>
                    <ServiceDemo slug={active.slug} locale={locale} />
                  </div>
                </MorphTransition>

                <ul className="flex flex-col gap-2.5">
                  {active.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <CheckCircle size={16} weight="duotone" className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`${prefix}/servicios/${active.slug}`}
                  className="group inline-flex min-h-11 items-center gap-2 self-start rounded-full text-sm font-semibold text-foreground outline-none hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {copy.openService}
                  <span className="sr-only">: {active.title}</span>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      )}
    </div>
  );
}
