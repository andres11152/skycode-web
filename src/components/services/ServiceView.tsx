"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Sparkle } from "@phosphor-icons/react";
import {
  CodeConsoleWidget,
  MobileAppPreviewWidget,
  ApiInspectorWidget,
  PerformanceMeterWidget,
  EcommerceCheckoutWidget,
  SecurityComplianceWidget,
  ArchitectureDocWidget,
  LegacyMigrationWidget,
  AiAppliedWidget,
} from "@/components/services/BentoServiceWidgets";
import { getServicesContent, getServiceBySlug } from "@/content/services";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { getTrustContent } from "@/content/trust";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { InlineText } from "@/components/blog/InlineText";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

export function ServiceView({ slug, locale = defaultLocale }: { slug: string; locale?: Locale }) {
  // Sin animación de entrada a propósito: el contenedor con
  // initial/animate se quitó en 509d3ba porque dejaba el contenido en
  // opacity 0 hasta hidratar y cargar las features diferidas de Motion,
  // retrasando el LCP. Los `motion.div variants` que quedaron sin
  // disparador no animaban nada; ahora son elementos normales.
  const service = getServiceBySlug(slug, locale);

  if (!service) {
    notFound();
  }

  const { services } = getServicesContent(locale);
  const servicePageData = getServicePageContent(locale);
  const navData = getNavContent(locale);
  // Prácticas reales, ya establecidas en TrustStrip — mismo patrón que ProjectView:
  // se reusan tal cual, no se inventan promesas nuevas por servicio.
  const approachItems = getTrustContent(locale).items;

  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  // Apunta al índice real /servicios (no al ancla #servicios de la home) —
  // el breadcrumb debe reflejar la jerarquía de rutas real.
  const servicesIndexHref = `${prefix}/servicios`;
  const contactHref = `${prefix}/#contacto`;

  const details = service.details;

  const currentIndex = services.findIndex((item) => item.slug === slug);
  const nextService = services[(currentIndex + 1) % services.length];

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <nav aria-label={servicePageData.breadcrumbAria}>
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link
                href={homePath}
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {navData.inicio}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground font-medium">{service.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br from-foreground/5 to-foreground/[0.01] text-accent shadow-[0_0_25px_rgba(0,137,205,0.12)]">
                  <service.coverIcon size={30} weight="duotone" aria-hidden="true" />
                </div>
                <SectionEyebrow>{servicePageData.enterpriseSolutionBadge}</SectionEyebrow>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
                {service.title}
              </h1>
            </header>

            <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">
              {service.description}
            </p>

            {details?.intro.map((paragraph) => (
              <p key={paragraph} className="max-w-2xl text-base leading-relaxed text-foreground/80">
                <InlineText text={paragraph} />
              </p>
            ))}

            {/* Interactive Demo & Environment Simulation Box */}
            <div className="rounded-xl border border-foreground/10 p-6 bg-foreground/[0.02]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60 mb-4 flex items-center gap-2">
                <Sparkle size={14} className="text-accent" /> {servicePageData.interactiveDemoHeading}
              </h2>
              {slug === "desarrollo-software-medida" && <CodeConsoleWidget locale={locale} />}
              {slug === "desarrollo-aplicaciones-moviles" && <MobileAppPreviewWidget locale={locale} />}
              {slug === "apis-integraciones" && <ApiInspectorWidget locale={locale} />}
              {slug === "frontend-alto-rendimiento" && <PerformanceMeterWidget />}
              {slug === "ecommerce-tienda-online" && <EcommerceCheckoutWidget />}
              {slug === "seguridad-cumplimiento" && <SecurityComplianceWidget locale={locale} />}
              {slug === "arquitectura-documentacion" && <ArchitectureDocWidget />}
              {slug === "migracion-datos-legacy" && <LegacyMigrationWidget locale={locale} />}
              {slug === "inteligencia-artificial-aplicada" && <AiAppliedWidget locale={locale} />}
            </div>

            <div className="rounded-xl border border-foreground/10 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                {servicePageData.includesHeading}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <CheckCircle size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {details && (
              <>
                <section aria-labelledby="service-steps" className="flex flex-col gap-6">
                  <h2 id="service-steps" className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
                    {details.stepsHeading}
                  </h2>
                  <ol className="grid gap-4 sm:grid-cols-2">
                    {details.steps.map((step, index) => (
                      <li key={step.title} className="flex flex-col gap-2 rounded-xl border border-foreground/10 p-6">
                        <span className="font-mono text-xs font-medium text-foreground/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
                        <p className="text-sm leading-relaxed text-foreground/80">
                          <InlineText text={step.text} />
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section aria-labelledby="service-use-cases" className="flex flex-col gap-4">
                  <h2 id="service-use-cases" className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
                    {details.useCasesHeading}
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {details.useCases.map((useCase) => (
                      <li key={useCase} className="flex items-start gap-2.5 text-base leading-relaxed text-foreground/80">
                        <CheckCircle size={18} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
                        <span>
                          <InlineText text={useCase} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            <div className="rounded-xl border border-foreground/10 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                {servicePageData.approachHeading}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {approachItems.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <CheckCircle size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {details && (
              <>
                <section aria-labelledby="service-faq" className="flex flex-col gap-2">
                  <h2 id="service-faq" className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
                    {details.faqHeading}
                  </h2>
                  <div className="mt-2 flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                    {details.faqs.map((item) => (
                      <div key={item.question} className="flex flex-col gap-2 py-5">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.question}</h3>
                        <p className="text-base leading-relaxed text-foreground/80">
                          <InlineText text={item.answer} />
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="service-related" className="flex flex-col gap-4">
                  <h2 id="service-related" className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                    {details.relatedHeading}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {details.related.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex flex-col gap-2 rounded-xl border border-foreground/10 p-6 outline-none transition-colors hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="flex items-center justify-between gap-3 text-base font-semibold text-foreground group-hover:text-accent-strong">
                          {link.label}
                          <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/80">{link.description}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          <aside
            className="flex flex-col gap-6 lg:sticky lg:top-28 lg:h-fit"
          >
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
              <p className="text-base font-medium text-foreground">
                {servicePageData.ctaQuestion}
              </p>
              <Button href={contactHref} variant="accent" size="md" className="mt-4 w-full">
                {servicePageData.ctaButton}
              </Button>
            </div>

            <Link
              href={`${prefix}/servicios/${nextService.slug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-foreground/10 p-6 outline-none transition-colors hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                  {servicePageData.nextServiceLabel}
                </span>
                <p className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-accent-strong">
                  {nextService.title}
                </p>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-strong"
              />
            </Link>
          </aside>
        </div>

        <div className="border-t border-foreground/10 pt-8">
          <Link
            href={servicesIndexHref}
            className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={14} />
            {servicePageData.backToServices}
          </Link>
        </div>
      </div>
    </main>
  );
}
