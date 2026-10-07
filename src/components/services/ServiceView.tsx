import { BogotaLink } from "@/components/bogota/BogotaLink";
import { getServiceSeo } from "@/content/serviceSeo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle } from "@phosphor-icons/react/ssr";
import ServiceDemo from "@/components/services/ServiceDemo";
import { PageToc, type PageTocItem } from "@/components/ui/PageToc";
import { ServiceCaseCard } from "@/components/services/ServiceCaseCard";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { Button } from "@/components/ui/Button";
import { InlineText } from "@/components/blog/InlineText";
import { PostCard } from "@/components/blog/PostCard";
import { getServicesContent, getServiceBySlug } from "@/content/services";
import { getServiceDetails } from "@/content/serviceDetails";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { getPostBySlug } from "@/content/blog";
import { getBlogMeta, type BlogPost } from "@/content/blogShared";
import { getRelatedPostSlugsForService } from "@/content/relatedContent";
import { getTrustContent } from "@/content/trust";
import type { PortfolioProject } from "@/content/portfolioShared";
import { defaultLocale, localeHomePath, t, type Locale } from "@/lib/i18n";
import { withoutTodos } from "@/lib/todoPlaceholders";

const H2 = "text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl";
const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";

/**
 * `/servicios/[slug]` — Server Component: las únicas islas cliente son la
 * demo (`ServiceDemo`) y el índice lateral (`PageToc`). Sin animación de
 * entrada en el hero a propósito (el H1 es el LCP, ver 509d3ba); lo que
 * está bajo el pliegue se revela con CSS ligado al scroll, sin JS.
 */
export async function ServiceView({
  slug,
  locale = defaultLocale,
  projects = [],
}: {
  slug: string;
  locale?: Locale;
  /** Casos del portafolio donde se aplicó este servicio, ya filtrados por la página. */
  projects?: PortfolioProject[];
}) {
  const service = getServiceBySlug(slug, locale);

  if (!service) {
    notFound();
  }

  const { services } = getServicesContent(locale);
  const pageCopy = getServicePageContent(locale);
  const copy = pageCopy.detail;
  const navData = getNavContent(locale);
  // Prácticas reales, ya establecidas en TrustStrip — se reusan tal cual,
  // no se inventan promesas nuevas por servicio.
  const approachItems = getTrustContent(locale).items;

  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const servicesIndexHref = `${prefix}/servicios`;
  const contactHref = `${prefix}/#contacto`;
  const estimatorHref = `${prefix}/cotizador`;

  const details = getServiceDetails(service.slug, locale);
  const currentIndex = services.findIndex((item) => item.slug === slug);
  const nextService = services[(currentIndex + 1) % services.length];

  const hasOverview = Boolean(details && (details.intro.length > 0 || details.challenge || details.useCases?.length));
  const hasProcess = Boolean(details?.steps.length);
  const hasFaq = Boolean(details?.faqs.length);

  // Sección "Desarrollo de X en Colombia": los datos de negocio pendientes
  // ({{TODO}}) van en viñetas propias que `withoutTodos` omite en producción.
  const colombiaParagraphs = details?.colombia ? withoutTodos(details.colombia.paragraphs) : [];
  const colombiaFacts = details?.colombia ? withoutTodos(details.colombia.facts) : [];
  const hasColombia = colombiaParagraphs.length > 0;
  const proof = details?.proof && details.proof.items.length > 0 ? details.proof : null;

  // Artículos relacionados: la relación sale de relatedContent.ts; un post
  // sin versión publicada en este idioma simplemente se omite.
  const relatedPosts = (
    await Promise.all(getRelatedPostSlugsForService(service.slug).map((postSlug) => getPostBySlug(postSlug, locale)))
  ).filter((post): post is BlogPost => post !== null);
  const blogMeta = getBlogMeta(locale);

  const tocItems: PageTocItem[] = [
    hasOverview && { id: "resumen", label: copy.tocOverview },
    { id: "incluye", label: copy.tocIncludes },
    hasProcess && { id: "proceso", label: copy.tocProcess },
    proof && { id: "evidencia", label: copy.tocProof },
    hasColombia && { id: "colombia", label: copy.tocColombia },
    projects.length > 0 && { id: "casos", label: copy.tocCases },
    hasFaq && { id: "faq", label: copy.tocFaq },
    relatedPosts.length > 0 && { id: "articulos", label: copy.tocArticles },
  ].filter((item): item is PageTocItem => Boolean(item));

  return (
    <main id="main-content">
      <section className="px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={pageCopy.breadcrumbAria}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
              <li>
                <Link
                  href={homePath}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.inicio}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={servicesIndexHref}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.servicios}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-foreground">
                {service.title}
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-16">
            <div className="flex flex-col items-start gap-6">
              <div className="flex items-center gap-4">
                <MorphTransition name={`service-icon-${service.slug}`}>
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-background text-accent-strong"
                  >
                    <service.coverIcon size={30} weight="duotone" />
                  </span>
                </MorphTransition>
                <p className={LABEL}>
                  {t(copy.positionLabel, {
                    current: String(currentIndex + 1).padStart(2, "0"),
                    total: String(services.length).padStart(2, "0"),
                  })}
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {getServiceSeo(slug, locale)?.h1 ?? service.title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{service.description}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button href={contactHref} variant="accent" size="md" data-contact-service={service.slug}>
                  {pageCopy.ctaButton}
                </Button>
                <Button href={hasProcess ? "#proceso" : "#incluye"} variant="secondary" size="md" showFlowArrows={false}>
                  {copy.secondaryCta}
                </Button>
              </div>
            </div>

            <MorphTransition name={`service-demo-${service.slug}`}>
              <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5">
                <ServiceDemo slug={service.slug} locale={locale} />
              </div>
            </MorphTransition>
          </div>
        </div>
      </section>

      <div className="border-t border-foreground/10 px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 flex flex-col gap-10">
              <PageToc items={tocItems} label={copy.tocLabel} layoutId="service-toc-active" />
              <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 p-5">
                <p className="text-sm font-medium text-foreground">{pageCopy.ctaQuestion}</p>
                <Button href={contactHref} variant="primary" size="sm" showFlowArrows={false} data-contact-service={service.slug}>
                  {pageCopy.ctaButton}
                </Button>
                <Link
                  href={estimatorHref}
                  className="link-underline w-fit rounded text-sm font-medium text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {pageCopy.estimatorLink}
                </Link>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 max-w-3xl flex-col gap-24">
            {hasOverview && details && (
              <section id="resumen" aria-labelledby="service-overview" className="flex scroll-mt-28 flex-col gap-8">
                <h2 id="service-overview" className="sr-only">
                  {copy.tocOverview}
                </h2>
                {details.intro.map((paragraph) => (
                  <p key={paragraph} className="text-lg leading-relaxed text-foreground/80">
                    <InlineText text={paragraph} />
                  </p>
                ))}

                {details.challenge && (
                  <div className="scroll-reveal rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:p-8">
                    <p className={LABEL}>{copy.challengeLabel}</p>
                    <h3 className="mt-3 text-xl font-bold tracking-tight text-balance text-foreground">
                      {details.challenge.heading}
                    </h3>
                    <ul className="mt-5 flex flex-col gap-3">
                      {details.challenge.points.map((point) => (
                        <li key={point} className="flex items-start gap-3 text-base leading-relaxed text-foreground/80">
                          <span aria-hidden="true" className="mt-3 h-px w-3 shrink-0 bg-foreground/40" />
                          <span>
                            <InlineText text={point} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {details.useCases && details.useCases.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xl font-bold tracking-tight text-balance text-foreground">
                      {details.useCasesHeading}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {details.useCases.map((useCase) => (
                        <li key={useCase} className="flex items-start gap-2.5 text-base leading-relaxed text-foreground/80">
                          <CheckCircle size={18} weight="duotone" className="mt-1 shrink-0 text-accent-strong" aria-hidden="true" />
                          <span>
                            <InlineText text={useCase} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section id="incluye" aria-labelledby="service-includes" className="flex scroll-mt-28 flex-col gap-8">
              <h2 id="service-includes" className={H2}>
                {pageCopy.includesHeading}
              </h2>
              <ul className="grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 bg-background p-5 text-sm leading-relaxed text-foreground/80 sm:last:odd:col-span-2">
                    <CheckCircle size={18} weight="duotone" className="shrink-0 text-accent-strong" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {details?.deliverables && details.deliverables.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{copy.deliverablesHeading}</h3>
                  <ol className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                    {details.deliverables.map((deliverable, index) => (
                      <li key={deliverable} className="flex items-baseline gap-4 py-4 text-base text-foreground/80">
                        <span aria-hidden="true" className="font-mono text-xs text-foreground/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <InlineText text={deliverable} />
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold tracking-tight text-foreground">{pageCopy.approachHeading}</h3>
                <ul className="flex flex-wrap gap-2">
                  {approachItems.map((item) => (
                    <li key={item.label} className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-sm text-foreground/80">
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {hasProcess && details && (
              <section id="proceso" aria-labelledby="service-steps" className="flex scroll-mt-28 flex-col gap-10">
                <h2 id="service-steps" className={H2}>
                  {details.stepsHeading}
                </h2>
                {/* Línea vertical que se dibuja con el scroll (CSS, sin JS). */}
                <ol className="relative flex flex-col gap-10">
                  <span aria-hidden="true" className="absolute top-4 bottom-4 left-4 w-px -translate-x-1/2 bg-foreground/10">
                    <span className="scroll-progress-y block h-full w-full bg-accent" />
                  </span>
                  {details.steps.map((step, index) => (
                    <li key={step.title} className="scroll-reveal relative grid grid-cols-[2rem_minmax(0,1fr)] gap-5">
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 bg-background font-mono text-xs font-bold text-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex flex-col gap-2 pt-1">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                        <p className="text-base leading-relaxed text-foreground/80">
                          <InlineText text={step.text} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {proof && (
              <section id="evidencia" aria-labelledby="service-proof" className="flex scroll-mt-28 flex-col gap-6">
                <h2 id="service-proof" className={H2}>
                  {proof.heading}
                </h2>
                <p className="text-base leading-relaxed text-foreground/80 sm:text-lg">{proof.intro}</p>
                <dl className="grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10">
                  {proof.items.map((item) => (
                    <div key={item.label} className="flex flex-col gap-2 bg-background p-5">
                      <dt className="font-mono text-xs tracking-wide text-foreground/70 uppercase">{item.label}</dt>
                      <dd className="flex flex-col gap-2">
                        <span className="text-2xl font-bold tracking-tight text-foreground">{item.value}</span>
                        <span className="text-sm leading-relaxed text-foreground/80">{item.text}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {hasColombia && details?.colombia && (
              <section id="colombia" aria-labelledby="service-colombia" className="flex scroll-mt-28 flex-col gap-6">
                <h2 id="service-colombia" className={H2}>
                  {details.colombia.heading}
                </h2>
                {colombiaParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-foreground/80 sm:text-lg">
                    <InlineText text={paragraph} />
                  </p>
                ))}
                {colombiaFacts.length > 0 && (
                  <ul className="flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10">
                    {colombiaFacts.map((fact) => (
                      <li key={fact} className="px-5 py-4 text-base leading-relaxed text-foreground/80">
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {projects.length > 0 && (
              <section id="casos" aria-labelledby="service-cases" className="flex scroll-mt-28 flex-col gap-8">
                <h2 id="service-cases" className={H2}>
                  {copy.casesHeading}
                </h2>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {projects.map((project) => (
                    <li key={project.slug}>
                      <ServiceCaseCard project={project} locale={locale} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {hasFaq && details && (
              <section id="faq" aria-labelledby="service-faq" className="flex scroll-mt-28 flex-col gap-6">
                <h2 id="service-faq" className={H2}>
                  {details.faqHeading}
                </h2>
                <div className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                  {details.faqs.map((item) => (
                    <div key={item.question} className="flex flex-col gap-2 py-6">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.question}</h3>
                      <p className="text-base leading-relaxed text-foreground/80">
                        <InlineText text={item.answer} />
                      </p>
                    </div>
                  ))}
                </div>

                {details.related && details.related.length > 0 && (
                  <div className="mt-10 flex flex-col gap-4">
                    <h3 className={LABEL}>{details.relatedHeading}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {details.related.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group flex flex-col gap-2 rounded-xl border border-foreground/10 p-6 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span className="flex items-center justify-between gap-3 text-base font-semibold text-foreground group-hover:text-accent-strong">
                            {link.label}
                            <ArrowRight
                              size={16}
                              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-sm leading-relaxed text-foreground/80">{link.description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {relatedPosts.length > 0 && (
              <section id="articulos" aria-labelledby="service-articles" className="flex scroll-mt-28 flex-col gap-8">
                <h2 id="service-articles" className={H2}>
                  {copy.relatedPostsHeading}
                </h2>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {relatedPosts.map((post) => (
                    <li key={post.slug}>
                      <PostCard post={post} headingLevel="h3" readingTimeSuffix={blogMeta.readingTimeSuffix} locale={locale} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* CTA visible en móvil, donde no existe el aside. */}
            <div className="flex flex-col items-start gap-4 rounded-xl border border-foreground/10 p-6 lg:hidden">
              <p className="text-base font-medium text-foreground">{pageCopy.ctaQuestion}</p>
              <Button href={contactHref} variant="primary" size="md" showFlowArrows={false} data-contact-service={service.slug}>
                {pageCopy.ctaButton}
              </Button>
              <Link
                href={estimatorHref}
                className="link-underline w-fit rounded text-sm font-medium text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {pageCopy.estimatorLink}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Entrada a la página local de Bogotá. */}
      <div className="border-t border-foreground/10 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <BogotaLink locale={locale} />
        </div>
      </div>

      {/* Siguiente servicio — sin morph a propósito: el enlace está al fondo
          y el hero de destino arriba, y React solo empareja elementos que
          están en el viewport (Next reinicia el scroll al navegar), así que
          el par nunca se formaría. */}
      <section aria-label={pageCopy.nextServiceLabel} className="border-t border-foreground/10 px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`${prefix}/servicios/${nextService.slug}`}
            className="group flex items-center justify-between gap-6 rounded-xl py-14 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:py-20"
          >
            <div className="flex min-w-0 items-center gap-5 sm:gap-6">
              <span
                aria-hidden="true"
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-background text-foreground/70 transition-colors duration-200 group-hover:border-accent/30 group-hover:text-accent-strong sm:flex"
              >
                <nextService.coverIcon size={30} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className={LABEL}>{pageCopy.nextServiceLabel}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-4xl">
                  {nextService.title}
                </p>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:border-accent-strong group-hover:bg-accent-strong group-hover:text-accent-foreground motion-reduce:transform-none"
            >
              <ArrowRight size={22} />
            </span>
          </Link>
        </div>
      </section>

      <div className="border-t border-foreground/10 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={servicesIndexHref}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {pageCopy.backToServices}
          </Link>
        </div>
      </div>
    </main>
  );
}
