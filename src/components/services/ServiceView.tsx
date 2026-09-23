"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Sparkle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
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
import { getServicesContent, getServiceBySlug } from "@/content/services";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { getTrustContent } from "@/content/trust";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

export function ServiceView({ slug, locale = defaultLocale }: { slug: string; locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
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

  const currentIndex = services.findIndex((item) => item.slug === slug);
  const nextService = services[(currentIndex + 1) % services.length];

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <motion.div
        variants={staggerContainer(reduced)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-6xl flex-col gap-10"
      >
        <motion.nav variants={fadeUp(reduced)} aria-label={servicePageData.breadcrumbAria}>
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
        </motion.nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <motion.header variants={fadeUp(reduced)} className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br from-foreground/5 to-foreground/[0.01] text-accent shadow-[0_0_25px_rgba(0,137,205,0.12)]">
                  <service.coverIcon size={30} weight="duotone" aria-hidden="true" />
                </div>
                <SectionEyebrow>{servicePageData.enterpriseSolutionBadge}</SectionEyebrow>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
                {service.title}
              </h1>
            </motion.header>

            <motion.p
              variants={fadeUp(reduced)}
              className="max-w-2xl text-lg leading-relaxed text-foreground/80"
            >
              {service.description}
            </motion.p>

            {/* Interactive Demo & Environment Simulation Box */}
            <motion.div variants={fadeUp(reduced)} className="rounded-xl border border-foreground/10 p-6 bg-foreground/[0.02]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60 mb-4 flex items-center gap-2">
                <Sparkle size={14} className="text-accent" /> {servicePageData.interactiveDemoHeading}
              </h2>
              {slug === "desarrollo-software-medida" && <CodeConsoleWidget locale={locale} />}
              {slug === "desarrollo-aplicaciones-moviles" && <MobileAppPreviewWidget locale={locale} />}
              {slug === "apis-integraciones" && <ApiInspectorWidget locale={locale} />}
              {slug === "frontend-alto-rendimiento" && <PerformanceMeterWidget />}
              {slug === "seguridad-cumplimiento" && <SecurityComplianceWidget locale={locale} />}
              {slug === "arquitectura-documentacion" && <ArchitectureDocWidget />}
              {slug === "migracion-datos-legacy" && <LegacyMigrationWidget locale={locale} />}
              {slug === "inteligencia-artificial-aplicada" && <AiAppliedWidget locale={locale} />}
            </motion.div>

            <motion.div variants={fadeUp(reduced)} className="rounded-xl border border-foreground/10 p-6">
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
            </motion.div>

            <motion.div variants={fadeUp(reduced)} className="rounded-xl border border-foreground/10 p-6">
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
            </motion.div>
          </div>

          <motion.aside
            variants={fadeUp(reduced)}
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
          </motion.aside>
        </div>

        <motion.div variants={fadeUp(reduced)} className="border-t border-foreground/10 pt-8">
          <Link
            href={servicesIndexHref}
            className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={14} />
            {servicePageData.backToServices}
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
