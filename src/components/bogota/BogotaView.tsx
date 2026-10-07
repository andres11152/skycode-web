import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/ssr";
import { InlineText } from "@/components/blog/InlineText";
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { Button } from "@/components/ui/Button";
import { PageToc, type PageTocItem } from "@/components/ui/PageToc";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getBogotaContent, type BogotaRow } from "@/content/bogota";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const CONTACT_HREF = "/#contacto";
const H2 = "text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl";
const H3 = "text-lg font-bold tracking-tight text-foreground";
const BODY = "text-base leading-relaxed text-foreground/80 sm:text-lg sm:leading-relaxed";
const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
// Enlace estirado: el <a> envuelve solo el título (su nombre accesible es el texto visible) y su
// ::after cubre la tarjeta entera; el anillo de foco se dibuja en ese ::after.
const STRETCHED =
  "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background";
const CARD =
  "relative rounded-xl border border-foreground/10 bg-background p-6 transition-colors duration-200 hover:border-foreground/25";
const SECONDARY_ON_DARK =
  "border-background/25 text-background hover:border-background/40 hover:bg-background/10 focus-visible:ring-offset-foreground";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-titulo`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-24 flex-col gap-8">
      <h2 id={headingId} className={H2}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <p className={BODY}>
      <InlineText text={text} />
    </p>
  );
}

/** Filas "etiqueta → valor". Si no queda ninguna (todas pendientes de dato real) no se dibuja nada. */
function RangeList({ heading, rows }: { heading: string; rows: BogotaRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={H3}>{heading}</h3>
      <dl className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
            <dt className="text-base text-foreground/80">{row.label}</dt>
            <dd className="text-base font-semibold text-foreground sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Página local `/desarrollo-software-bogota`. Server Component sin animación de
 * entrada (el H1 es el LCP). Todo el copy sale de `content/bogota.ts`.
 */
export function BogotaView() {
  const content = getBogotaContent();
  const { hero, about, services, cases, process, compliance, pricing, timelines, faq, cta } = content;

  const tocItems: PageTocItem[] = [
    { id: about.id, label: about.tocLabel },
    { id: services.id, label: services.tocLabel },
    { id: cases.id, label: cases.tocLabel },
    { id: process.id, label: process.tocLabel },
    { id: compliance.id, label: compliance.tocLabel },
    { id: pricing.id, label: pricing.tocLabel },
    { id: timelines.id, label: timelines.tocLabel },
    faq.items.length > 0 && { id: faq.id, label: faq.tocLabel },
  ].filter((item): item is PageTocItem => Boolean(item));

  return (
    <main id="main-content">
      <section aria-labelledby="bogota-h1" className="px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={content.breadcrumb.aria}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
              <li>
                <Link href="/" className={cn("rounded hover:text-foreground", FOCUS)}>
                  {content.breadcrumb.home}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-foreground">
                {content.breadcrumb.current}
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-16">
            <div className="flex flex-col items-start gap-6">
              <SectionEyebrow>{hero.eyebrow}</SectionEyebrow>
              <h1 id="bogota-h1" className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                {hero.h1}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{hero.lead}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button href={CONTACT_HREF} variant="accent" size="lg">
                  {hero.ctaPrimary}
                </Button>
                <Button
                  href={whatsappHref}
                  variant="secondary"
                  size="lg"
                  showFlowArrows={false}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hero.ctaSecondary}
                </Button>
              </div>
            </div>

            <aside aria-label={hero.factsLabel} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
              <p className={LABEL}>{hero.factsLabel}</p>
              <ul className="mt-5 flex flex-col divide-y divide-foreground/10">
                {hero.facts.map((fact) => (
                  <li key={fact.label} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <CheckCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-accent-strong" aria-hidden="true" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{fact.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/80">{fact.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <div className="border-t border-foreground/10 px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <PageToc items={tocItems} label={content.tocLabel} layoutId="bogota-toc-active" />
            </div>
          </aside>

          <div className="flex min-w-0 max-w-3xl flex-col gap-24">
            <Section id={about.id} heading={about.heading}>
              {about.paragraphs.map((paragraph) => (
                <Paragraph key={paragraph} text={paragraph} />
              ))}
              <ul className="grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
                {about.pillars.map((pillar) => (
                  <li key={pillar.title} className="flex flex-col gap-2 bg-background p-6">
                    <h3 className={H3}>{pillar.title}</h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{pillar.text}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id={services.id} heading={services.heading}>
              <Paragraph text={services.intro} />
              <ul className="grid gap-4 sm:grid-cols-2">
                {services.items.map((item) => (
                  <li key={item.slug} className={cn(CARD, "flex flex-col gap-2")}>
                    <h3 className="text-base font-bold tracking-tight text-foreground">
                      <Link href={`/servicios/${item.slug}`} className={cn("group inline-flex items-start gap-2", STRETCHED)}>
                        <span>{item.anchor}</span>
                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                          className="mt-1 shrink-0 text-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{item.text}</p>
                  </li>
                ))}
              </ul>
              <div>
                <Button href="/servicios" variant="secondary" size="md">
                  {services.allLabel}
                </Button>
              </div>
            </Section>

            <Section id={cases.id} heading={cases.heading}>
              <Paragraph text={cases.intro} />
              <ol className="flex flex-col gap-4">
                {cases.items.map((item, index) => (
                  <li key={item.slug} className={cn(CARD, "flex flex-col gap-3 sm:flex-row sm:gap-6")}>
                    <span aria-hidden="true" className="font-mono text-xs text-foreground/60 sm:pt-1.5">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-2">
                      <p className={LABEL}>
                        {cases.caseLabel} · {item.sector}
                      </p>
                      <h3 className="text-xl font-bold tracking-tight text-foreground">
                        <Link href={portfolioCasePath("es", item.slug)} className={cn("group inline-flex items-center gap-2", STRETCHED)}>
                          <span>{item.name}</span>
                          <ArrowRight
                            size={18}
                            aria-hidden="true"
                            className="shrink-0 text-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                          />
                        </Link>
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/80 sm:text-base sm:leading-relaxed">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div>
                <Button href={portfolioIndexPath("es")} variant="secondary" size="md">
                  {cases.allLabel}
                </Button>
              </div>
            </Section>

            <Section id={process.id} heading={process.heading}>
              <Paragraph text={process.intro} />
              <ol className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
                {process.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-5 py-6">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 font-mono text-sm font-bold text-foreground"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className={H3}>{step.title}</h3>
                      <p className="text-base leading-relaxed text-foreground/80">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {process.closing.map((paragraph) => (
                <Paragraph key={paragraph} text={paragraph} />
              ))}
            </Section>

            <Section id={compliance.id} heading={compliance.heading}>
              <Paragraph text={compliance.intro} />
              <ul className="grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
                {compliance.principles.map((principle) => (
                  <li key={principle.title} className="flex flex-col gap-2 bg-background p-6">
                    <h3 className={H3}>{principle.title}</h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{principle.text}</p>
                  </li>
                ))}
              </ul>
              <Paragraph text={compliance.closing} />
            </Section>

            <Section id={pricing.id} heading={pricing.heading}>
              <Paragraph text={pricing.intro} />
              <div className="flex flex-col gap-4">
                <h3 className={H3}>{pricing.factorsHeading}</h3>
                <ul className="flex flex-col gap-3">
                  {pricing.factors.map((factor) => (
                    <li key={factor} className="flex items-start gap-2.5 text-base leading-relaxed text-foreground/80">
                      <CheckCircle size={18} weight="duotone" className="mt-1 shrink-0 text-accent-strong" aria-hidden="true" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <RangeList heading={pricing.rangesHeading} rows={pricing.rows} />
              <Paragraph text={pricing.paymentNote} />
              <Paragraph text={pricing.estimatorText} />
            </Section>

            <Section id={timelines.id} heading={timelines.heading}>
              <Paragraph text={timelines.intro} />
              <RangeList heading={timelines.rangesHeading} rows={timelines.rows} />
              <Paragraph text={timelines.note} />
            </Section>

            {faq.items.length > 0 && (
              <Section id={faq.id} heading={faq.heading}>
                <div className="border-t border-foreground/10">
                  {faq.items.map((item) => (
                    <FaqAccordionItem key={item.id} item={item} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Cierre: banda oscura (bg-foreground), la única de la página. */}
      <section aria-labelledby="bogota-cta-titulo" className="bg-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <h2 id="bogota-cta-titulo" className="text-3xl font-bold tracking-tight text-balance text-background sm:text-4xl">
              {cta.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-background/80">{cta.body}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button href={CONTACT_HREF} variant="accent" size="lg" className="focus-visible:ring-offset-foreground">
              {cta.primary}
            </Button>
            <Button
              href={whatsappHref}
              variant="secondary"
              size="lg"
              showFlowArrows={false}
              target="_blank"
              rel="noopener noreferrer"
              className={SECONDARY_ON_DARK}
            >
              {cta.secondary}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
