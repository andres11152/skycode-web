import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/ssr";
import { InlineText } from "@/components/blog/InlineText";
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { Button } from "@/components/ui/Button";
import { RevealWords } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { ChipsVisual, ConsentMockup, PeopleVisual, RepoMockup } from "@/components/bogota/BogotaVisuals";
import { LiveClocks } from "@/components/bogota/LiveClocks";
import { getBogotaContent } from "@/content/bogota";
import { getProjectHostname, type PortfolioProject } from "@/content/portfolioShared";
import { getServicesContent } from "@/content/services";
import { getTestimonialsContent } from "@/content/testimonials";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

// El globo (WebGL) se difiere: no entra en el JS inicial ni compite con el LCP del H1.
const BogotaGlobe = dynamic(() => import("@/components/bogota/BogotaGlobe").then((m) => m.BogotaGlobe));

const CONTACT_HREF = "/#contacto";
const H2 = "max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl";
const H3 = "text-lg font-bold tracking-tight";
const BODY = "text-base leading-relaxed sm:text-lg sm:leading-relaxed";
const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
// Enlace estirado: el <a> envuelve solo el título (su nombre accesible es el texto visible) y su
// ::after cubre la tarjeta entera; el anillo de foco se dibuja en ese ::after.
const STRETCHED =
  "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background";
const CARD = "lift relative rounded-xl border border-foreground/10 bg-background p-6 hover:border-foreground/25";
/** Índice entre hermanos para el escalonado de los `reveal-*` (ver globals.css). */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;
const GLASS = "border border-foreground/10 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl";
const SECONDARY_ON_DARK =
  "border-background/25 text-background hover:border-background/40 hover:bg-background/10 focus-visible:ring-offset-foreground";

type Tone = "light" | "tint" | "dark";

/** Banda de ancho completo: el contenedor interno mantiene `max-w-6xl` como el resto del sitio. */
function Band({
  id,
  tone = "light",
  heading,
  eyebrow,
  children,
  className,
}: {
  id: string;
  tone?: Tone;
  heading: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id}-titulo`;
  const dark = tone === "dark";
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 px-6 py-20 sm:py-28",
        dark && "bg-foreground text-background",
        tone === "tint" && "border-y border-foreground/10 bg-foreground/[0.03]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="flex flex-col items-start gap-4">
          {eyebrow && (
            <div className="reveal-left">
              <SectionEyebrow onDark={dark}>{eyebrow}</SectionEyebrow>
            </div>
          )}
          {/* El titular sube palabra por palabra. `aria-label` dice el texto una sola vez; las palabras partidas van aria-hidden. */}
          <h2 id={headingId} aria-label={heading} className={cn(H2, dark ? "text-background" : "text-foreground")}>
            <RevealWords text={heading} />
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Paragraph({ text, className, index = 0 }: { text: string; className?: string; index?: number }) {
  return (
    <p className={cn(BODY, "reveal-blur text-foreground/80", className)} style={stagger(index)}>
      <InlineText text={text} />
    </p>
  );
}

/**
 * Página local `/desarrollo-software-bogota`. Server Component sin animación de
 * entrada (el H1 es el LCP). Todo el copy sale de `content/bogota.ts`; precios
 * y plazos, del cotizador. Las capturas de los casos llegan por prop desde
 * Postgres: sin ellas los casos se muestran solo con texto.
 */
export function BogotaView({ projects = [] }: { projects?: PortfolioProject[] }) {
  const content = getBogotaContent();
  const { hero, stats, about, services, cases, process, compliance, pricing, timelines, faq, cta } = content;
  const { testimonials } = getTestimonialsContent("es");
  const serviceIcons = new Map(getServicesContent("es").services.map((service) => [service.slug, service.coverIcon]));
  const projectsBySlug = new Map(projects.map((project) => [project.slug, project]));

  const pillar = (key: string) => about.pillars.find((item) => item.key === key);
  const maxWeeks = Math.max(...pricing.plans.map((plan) => plan.weeks));
  const plansByWeeks = [...pricing.plans].sort((a, b) => a.weeks - b.weeks || a.priceCop - b.priceCop);

  return (
    <main id="main-content" className="overflow-x-clip">
      {/* Barra de lectura de la página (CSS ligado al scroll del documento; oculta sin soporte o con reduced motion). */}
      <span
        aria-hidden="true"
        className="page-progress pointer-events-none fixed top-0 right-0 left-0 z-[55] h-0.5 bg-foreground"
      />

      {/* ───────────── Hero (claro) ───────────── */}
      <section aria-labelledby="bogota-h1" className="relative overflow-hidden px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
        {/* Grilla fina + resplandor de marca: estáticos, el movimiento vive en el globo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(10,10,10,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_70%_40%,black_20%,transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="parallax absolute top-10 right-0 -z-10 h-96 w-96 rounded-full bg-accent/[0.12] blur-[110px]"
          style={{ "--py-from": "-12%", "--py-to": "18%" } as CSSProperties}
        />

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

          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
            <div className="flex flex-col items-start gap-6">
              <SectionEyebrow>{hero.eyebrow}</SectionEyebrow>
              <h1
                id="bogota-h1"
                className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
              >
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

            <div className="assemble relative" style={{ "--d": 150 } as CSSProperties}>
              <BogotaGlobe label={hero.globeLabel} />
              <p
                className={cn(
                  GLASS,
                  "assemble absolute bottom-[8%] left-0 flex items-center gap-2.5 rounded-full py-2 pr-4 pl-3 text-sm font-medium text-foreground sm:left-[4%]",
                )}
                style={{ "--d": 600 } as CSSProperties}
              >
                <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                {hero.badge}
                <span aria-hidden="true" className="hidden font-mono text-xs text-foreground/70 sm:inline">
                  4.711° N · 74.072° O
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Compromisos (oscura) ───────────── */}
      <section aria-label={stats.label} className="bg-foreground px-6 py-16 text-background sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow onDark>{stats.label}</SectionEyebrow>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-background/10 bg-background/10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.items.map((item, index) => (
              <li key={item.label} className="reveal-scale flex flex-col gap-3 bg-foreground p-6 sm:p-8" style={stagger(index)}>
                <p className="flex items-baseline gap-2 font-bold tracking-tight text-background">
                  {/* La cifra sube desde detrás de una máscara (el texto sigue en el HTML). */}
                  <span className="word-mask text-5xl sm:text-6xl">
                    <span className="word-inner" style={{ "--w": index * 2 } as CSSProperties}>
                      {item.value}
                    </span>
                  </span>
                  {item.unit && <span className="text-lg text-background/70">{item.unit}</span>}
                </p>
                <div>
                  <p className="text-base font-semibold text-background">{item.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-background/80">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Qué hacemos (claro, bento) ───────────── */}
      <Band id={about.id} heading={about.heading}>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          {about.paragraphs.map((paragraph, index) => (
            <Paragraph key={paragraph} text={paragraph} index={index} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <article className={cn(CARD, "reveal-scale flex flex-col gap-6 lg:col-span-7")} style={stagger(0)}>
            <RepoMockup lines={about.visuals.repoLines} />
            <PillarText item={pillar("ownership")} />
          </article>
          <article className={cn(CARD, "reveal-scale flex flex-col gap-6 lg:col-span-5")} style={stagger(1)}>
            <PeopleVisual people={about.visuals.directPeople} label={about.visuals.directLabel} />
            <PillarText item={pillar("direct")} />
          </article>
          <article className={cn(CARD, "reveal-scale flex flex-col gap-6 lg:col-span-5")} style={stagger(0)}>
            <ChipsVisual chips={about.visuals.localChips} />
            <PillarText item={pillar("local")} />
          </article>
          <article className={cn(CARD, "reveal-scale flex flex-col gap-6 lg:col-span-7")} style={stagger(1)}>
            <LiveClocks clocks={hero.clocks} label={hero.clocksLabel} />
            <PillarText item={pillar("timezone")} />
          </article>
        </div>
      </Band>

      {/* ───────────── Servicios (oscura) ───────────── */}
      <Band id={services.id} tone="dark" heading={services.heading}>
        <p className={cn(BODY, "max-w-3xl text-background/80")}>
          <InlineText text={services.intro} />
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item, index) => {
            const Icon = serviceIcons.get(item.slug);
            return (
              <li key={item.slug} className="reveal-scale" style={stagger(index % 3)}>
                {/* Las tarjetas se quedan claras sobre la banda negra (mismo criterio que la home). */}
                <SpotlightCard className="h-full rounded-xl">
                  <div className="group/card relative flex h-full flex-col gap-4 rounded-xl bg-background p-6 text-foreground">
                    {Icon && (
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] transition-[scale,border-color] duration-300 group-hover/card:border-foreground/30 motion-safe:group-hover/card:scale-110 motion-reduce:transition-none">
                        <Icon size={22} weight="duotone" className="text-accent" aria-hidden="true" />
                      </span>
                    )}
                    <h3 className="text-base font-bold tracking-tight text-foreground">
                      <Link
                        href={`/servicios/${item.slug}`}
                        className={cn("group/link inline-flex items-start gap-2", STRETCHED)}
                      >
                        <span>{item.anchor}</span>
                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                          className="mt-1 shrink-0 text-foreground/60 transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/80">{item.text}</p>
                  </div>
                </SpotlightCard>
              </li>
            );
          })}
        </ul>
        <div>
          <Button
            href="/servicios"
            variant="secondary"
            size="md"
            className={SECONDARY_ON_DARK}
          >
            {services.allLabel}
          </Button>
        </div>
      </Band>

      {/* ───────────── Casos reales (claro) ───────────── */}
      <Band id={cases.id} heading={cases.heading}>
        <Paragraph text={cases.intro} className="max-w-3xl" />
        <ol className="grid gap-x-8 gap-y-14 md:grid-cols-2">
          {cases.items.map((item, index) => {
            const project = projectsBySlug.get(item.slug);
            const featured = index === 0;
            return (
              <li
                key={item.slug}
                className={cn(
                  "group relative flex flex-col gap-6 rounded-xl",
                  featured ? "md:col-span-2 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12" : "reveal-scale",
                )}
                style={featured ? undefined : stagger(index % 2)}
              >
                {project && (
                  <div className={cn(featured && "reveal-left lg:col-span-7")}>
                    <CaseVisual
                      slug={project.slug}
                      imageSrc={project.coverImage?.variants[featured ? "lg" : "md"] ?? null}
                      alt={project.coverImage?.alt || project.title}
                      industryIcon={project.industryIcon}
                      url={getProjectHostname(project)}
                      sizes={featured ? "(max-width: 1024px) 100vw, 700px" : "(max-width: 768px) 100vw, 560px"}
                      parallax={featured}
                      blurDataURL={project.coverImage?.blurDataURL}
                      color={project.coverImage?.color}
                      className="transition-colors duration-300 group-hover:border-foreground/25"
                    />
                  </div>
                )}
                <div className={cn("flex flex-col gap-3", featured && project && "reveal-right lg:col-span-5")}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-foreground/70">{String(index + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true" className="scroll-progress-x h-px w-8 bg-foreground/20" />
                    <span className={cn(LABEL, "text-foreground/70")}>
                      {cases.caseLabel} · {item.sector}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">
                    <Link
                      href={portfolioCasePath("es", item.slug)}
                      className={cn("group/link inline-flex items-center gap-2", STRETCHED)}
                    >
                      <span>{item.name}</span>
                      <ArrowRight
                        size={20}
                        aria-hidden="true"
                        className="shrink-0 text-foreground/60 transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </Link>
                  </h3>
                  <p className="text-base leading-relaxed text-foreground/80">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div>
          <Button href={portfolioIndexPath("es")} variant="secondary" size="md">
            {cases.allLabel}
          </Button>
        </div>
      </Band>

      {/* ───────────── Testimonios (oscura) ───────────── */}
      <Band id="testimonios" tone="dark" eyebrow={content.testimonials.eyebrow} heading={content.testimonials.heading}>
        <ul className="grid gap-4 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <li key={`${item.company}-${item.name}`} className="reveal-blur" style={stagger(index)}>
              <figure className="flex h-full flex-col justify-between gap-8 rounded-xl bg-background p-8 text-foreground">
                <blockquote className="text-base leading-relaxed text-foreground/80 sm:text-lg sm:leading-relaxed">
                  “{item.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-sm font-bold text-background"
                  >
                    {item.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    <span className="text-sm text-foreground/70">
                      {item.role} · {item.company}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Band>

      {/* ───────────── Proceso (claro, línea que se llena con el scroll) ───────────── */}
      <Band id={process.id} heading={process.heading}>
        <Paragraph text={process.intro} className="max-w-3xl" />
        <ol className="relative flex flex-col gap-10">
          <span aria-hidden="true" className="absolute top-0 bottom-0 left-[21px] w-px bg-foreground/10" />
          <span
            aria-hidden="true"
            className="scroll-progress-y absolute top-0 bottom-0 left-[21px] w-px bg-foreground motion-reduce:hidden"
          />
          {process.steps.map((step, index) => (
            <li key={step.title} className="relative flex items-start gap-6">
              <span
                aria-hidden="true"
                className="dot-on relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/15 bg-background font-mono text-sm font-bold text-foreground"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="reveal-right flex max-w-2xl flex-col gap-2 pt-1.5">
                <h3 className={cn(H3, "text-foreground")}>{step.title}</h3>
                <p className="text-base leading-relaxed text-foreground/80">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex max-w-3xl flex-col gap-5">
          {process.closing.map((paragraph, index) => (
            <Paragraph key={paragraph} text={paragraph} index={index} />
          ))}
        </div>
      </Band>

      {/* ───────────── Ley 1581 (claro, mockup oscuro) ───────────── */}
      <Band id={compliance.id} tone="tint" heading={compliance.heading}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <div className="flex flex-col gap-8">
            <Paragraph text={compliance.intro} />
            <ul className="grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
              {compliance.principles.map((principle, index) => (
                <li key={principle.title} className="reveal-scale flex flex-col gap-2 bg-background p-6" style={stagger(index % 2)}>
                  <h3 className={cn(H3, "text-foreground")}>{principle.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80">{principle.text}</p>
                </li>
              ))}
            </ul>
            <Paragraph text={compliance.closing} />
          </div>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ConsentMockup label={compliance.mockupLabel} className="reveal-right" />
          </div>
        </div>
      </Band>

      {/* ───────────── Precios (claro) ───────────── */}
      <Band id={pricing.id} heading={pricing.heading}>
        <div className="flex max-w-3xl flex-col gap-5">
          <Paragraph text={pricing.intro} />
          <p className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 text-base leading-relaxed text-foreground">
            {pricing.launchNote}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className={cn(H3, "text-foreground")}>{pricing.plansHeading}</h3>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.plans.map((plan, index) => (
              <li key={plan.id} className={cn(CARD, "reveal-scale flex flex-col gap-4")} style={stagger(index % 3)}>
                <p className="text-base font-semibold text-foreground">{plan.label}</p>
                <p className="flex flex-col">
                  <span className={cn(LABEL, "text-foreground/70")}>{pricing.fromLabel}</span>
                  <span className="word-mask mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    <span className="word-inner" style={{ "--w": index % 3 } as CSSProperties}>
                      {plan.price}
                    </span>
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">{plan.text}</p>
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/80">{pricing.baseNote}</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-4">
            <h3 className={cn(H3, "text-foreground")}>{pricing.factorsHeading}</h3>
            <ul className="flex flex-col gap-3">
              {pricing.factors.map((factor, index) => (
                <li
                  key={factor}
                  className="reveal-left flex items-start gap-2.5 text-base leading-relaxed text-foreground/80"
                  style={stagger(index)}
                >
                  <CheckCircle size={18} weight="duotone" className="dot-on mt-1 shrink-0 text-accent-strong" aria-hidden="true" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-start gap-5">
            <Paragraph text={pricing.paymentNote} />
            <Paragraph text={pricing.estimatorText} />
            <Button href="/cotizador" variant="primary" size="md">
              {pricing.estimatorCta}
            </Button>
          </div>
        </div>
      </Band>

      {/* ───────────── Tiempos (claro, barras) ───────────── */}
      <Band id={timelines.id} tone="tint" heading={timelines.heading}>
        <Paragraph text={timelines.intro} className="max-w-3xl" />
        <div className="flex flex-col gap-5">
          <h3 className={cn(H3, "text-foreground")}>{timelines.rangesHeading}</h3>
          <ul className="flex flex-col gap-4">
            {plansByWeeks.map((plan) => (
              <li key={plan.id} className="grid items-center gap-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_5.5rem] sm:gap-6">
                <span className="text-sm font-medium text-foreground/80">{plan.label}</span>
                <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
                  <span
                    className="scroll-progress-x block h-full rounded-full bg-foreground"
                    style={{ width: `${(plan.weeks / maxWeeks) * 100}%` }}
                  />
                </span>
                <span className="font-mono text-sm font-bold text-foreground tabular-nums sm:text-right">
                  {plan.weeks} {timelines.weeksUnit}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Paragraph text={timelines.note} className="max-w-3xl" />
      </Band>

      {/* ───────────── FAQ (claro) ───────────── */}
      {faq.items.length > 0 && (
        <Band id={faq.id} heading={faq.heading}>
          <div className="reveal-blur max-w-3xl border-t border-foreground/10">
            {faq.items.map((item) => (
              <FaqAccordionItem key={item.id} item={item} />
            ))}
          </div>
        </Band>
      )}

      {/* ───────────── Cierre (oscura) ───────────── */}
      <section aria-labelledby="bogota-cta-titulo" className="relative overflow-hidden bg-foreground">
        <div
          aria-hidden="true"
          className="parallax absolute -top-24 -right-16 h-80 w-80 rounded-full bg-background/[0.07] blur-[110px]"
          style={{ "--py-from": "-20%", "--py-to": "30%" } as CSSProperties}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 sm:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <h2
              id="bogota-cta-titulo"
              aria-label={cta.heading}
              className="text-3xl font-bold tracking-tight text-balance text-background sm:text-4xl"
            >
              <RevealWords text={cta.heading} />
            </h2>
            <p className="reveal-blur mt-4 text-lg leading-relaxed text-background/80">{cta.body}</p>
          </div>
          <div className="reveal-right flex flex-wrap items-center gap-3">
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

function PillarText({ item }: { item: { title: string; text: string } | undefined }) {
  if (!item) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn(H3, "text-foreground")}>{item.title}</h3>
      <p className="text-sm leading-relaxed text-foreground/80 sm:text-base sm:leading-relaxed">{item.text}</p>
    </div>
  );
}
