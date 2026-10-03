import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { InlineText } from "@/components/blog/InlineText";
import { ServicesExplorer } from "@/components/services/ServicesExplorer";
import { ServiceCaseCard } from "@/components/services/ServiceCaseCard";
import { getServicesContent, getServiceSlugsForProject } from "@/content/services";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { getProcessContent } from "@/content/process";
import { getTrustContent } from "@/content/trust";
import type { PortfolioProject } from "@/content/portfolioShared";
import { stripInlineLinks } from "@/lib/inlineLinks";
import { localeHomePath, t, type Locale } from "@/lib/i18n";

/** Receta de `Button variant="secondary"` invertida para las bandas oscuras. */
const SECONDARY_ON_DARK =
  "border-background/25 text-background hover:border-background/40 hover:bg-background/10 focus-visible:ring-offset-foreground";

/**
 * `/servicios` — Server Component a propósito: la única isla cliente es
 * `ServicesExplorer` (lista + vista previa). Narrativa de arriba a abajo:
 * qué hacemos (hero + índice) → cómo (proceso, banda oscura) → prueba
 * (casos reales) → objeciones (FAQ) → cierre (CTA, banda oscura). Nunca dos
 * bandas oscuras seguidas.
 */
export function ServicesIndexView({ locale, projects }: { locale: Locale; projects: PortfolioProject[] }) {
  const { services, servicesSection } = getServicesContent(locale);
  const pageCopy = getServicePageContent(locale);
  const copy = pageCopy.index;
  const navData = getNavContent(locale);
  const processData = getProcessContent(locale);
  const trustItems = getTrustContent(locale).items.slice(1, 4);

  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const contactHref = `${prefix}/#contacto`;
  const estimatorHref = `${prefix}/cotizador`;

  const serviceTitleBySlug = new Map(services.map((service) => [service.slug, service.title]));
  const cases = projects
    .map((project) => ({
      project,
      serviceTitles: getServiceSlugsForProject(project.slug)
        .map((slug) => serviceTitleBySlug.get(slug))
        .filter((title): title is string => Boolean(title)),
    }))
    .filter((item) => item.serviceTitles.length > 0)
    .slice(0, 3);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: copy.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
    })),
  };

  return (
    <main id="main-content">
      {/* Hero — sin animación de entrada: el H1 es el LCP. */}
      <section className="px-6 pt-28 pb-16 sm:pt-36 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={pageCopy.breadcrumbAria}>
            <ol className="flex items-center gap-2 text-sm text-foreground/70">
              <li>
                <Link
                  href={homePath}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.inicio}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-foreground">
                {navData.servicios}
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-16">
            <div className="flex max-w-3xl flex-col items-start gap-6">
              <SectionEyebrow>{servicesSection.badge}</SectionEyebrow>
              <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                {servicesSection.title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{servicesSection.description}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button href={contactHref} variant="accent" size="lg">
                  {copy.primaryCta}
                </Button>
                <Button href={estimatorHref} variant="secondary" size="lg" showFlowArrows={false}>
                  {copy.secondaryCta}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-foreground/10 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <p className="flex items-baseline gap-3">
                <span className="text-6xl font-bold tracking-tight text-foreground tabular-nums">
                  {String(services.length).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-foreground/70">{copy.countLabel}</span>
              </p>
              <ul className="flex flex-col gap-3">
                {trustItems.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <CheckCircle size={16} weight="duotone" className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl">
          <ServicesExplorer
            locale={locale}
            copy={{ listAria: copy.listAria, previewLabel: copy.previewLabel, openService: copy.openService }}
          />
        </div>
      </section>

      {/* Proceso — banda oscura. La línea superior se dibuja con el scroll (CSS). */}
      <section
        id="proceso"
        aria-labelledby="services-process-title"
        className="scroll-mt-24 bg-foreground px-6 py-24 text-background sm:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <SectionEyebrow onDark>{processData.badge}</SectionEyebrow>
            <h2 id="services-process-title" className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {processData.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-background/80">{processData.description}</p>
          </div>

          <div className="relative mt-16">
            <div aria-hidden="true" className="absolute inset-x-0 top-4 hidden h-px bg-background/15 lg:block">
              <div className="scroll-progress-x h-full w-full bg-accent" />
            </div>
            <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {processData.steps.map((step, index) => (
                <li key={step.title} className="scroll-reveal relative flex flex-col gap-3">
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-background/20 bg-foreground font-mono text-xs font-bold text-background">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-bold tracking-tight">{step.title.replace(/^\d+\.\s*/, "")}</h3>
                  <p className="text-sm leading-relaxed text-background/80">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {cases.length > 0 && (
        <section aria-labelledby="services-cases-title" className="px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <SectionEyebrow>{copy.casesBadge}</SectionEyebrow>
                <h2 id="services-cases-title" className="mt-4 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                  {copy.casesTitle}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-foreground/80">{copy.casesDescription}</p>
              </div>
              <Button href="/portafolio" variant="secondary" size="sm" className="shrink-0">
                {copy.casesViewAll}
              </Button>
            </div>

            <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cases.map(({ project, serviceTitles }) => (
                <li key={project.slug}>
                  <ServiceCaseCard
                    project={project}
                    serviceTitles={serviceTitles}
                    servicesLabel={t(copy.casesServicesLabel, { title: project.title })}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section
        aria-labelledby="services-faq-title"
        className={cases.length > 0 ? "border-t border-foreground/10 px-6 py-24 sm:py-32" : "px-6 py-24 sm:py-32"}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
        />
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <SectionEyebrow>{copy.faqBadge}</SectionEyebrow>
            <h2 id="services-faq-title" className="mt-4 text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              {copy.faqTitle}
            </h2>
          </div>
          <dl className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
            {copy.faqs.map((item) => (
              <div key={item.question} className="scroll-reveal flex flex-col gap-3 py-7">
                <dt className="text-lg font-semibold tracking-tight text-foreground">{item.question}</dt>
                <dd className="text-base leading-relaxed text-foreground/80">
                  <InlineText text={item.answer} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Cierre — banda oscura (la sección anterior es clara). */}
      <section aria-labelledby="services-cta-title" className="bg-foreground px-6 py-24 text-background sm:py-28">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 id="services-cta-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {copy.ctaTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-background/80">{copy.ctaDescription}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={contactHref} variant="accent" size="lg" className="focus-visible:ring-offset-foreground">
              {pageCopy.ctaButton}
            </Button>
            <Button href={estimatorHref} variant="secondary" size="lg" showFlowArrows={false} className={SECONDARY_ON_DARK}>
              {copy.secondaryCta}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
