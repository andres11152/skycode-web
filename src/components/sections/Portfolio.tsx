"use client";

import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Button } from "@/components/ui/Button";
import { EsBadge } from "@/components/ui/EsBadge";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getPortfolioSectionContent, type PortfolioSectionCopy } from "@/content/projects";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t, type Locale } from "@/lib/i18n";
import { getProjectHostname, type PortfolioProject } from "@/content/portfolioShared";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";

// Enlace estirado: el <a> es solo el título (nombre accesible = texto visible, WCAG 2.5.3)
// y su ::after cubre la tarjeta entera; el anillo de foco se dibuja en ese ::after.
const STRETCH =
  "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background";

// Cuántos casos secundarios acompañan al destacado en la home. El resto vive
// en /portafolio (botón "Ver todos"): la home es un adelanto, no el catálogo.
const SECONDARY_COUNT = 2;

const pad = (n: number) => String(n).padStart(2, "0");

/** Flecha circular de cada caso: mismo gesto que el índice de /portafolio. */
function CaseArrow() {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 transition-colors duration-200 group-hover:border-accent-strong group-hover:bg-accent-strong group-hover:text-accent-foreground"
    >
      <ArrowUpRight
        size={18}
        className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
      />
    </span>
  );
}

function FeaturedCase({
  project,
  uiData,
  sectionCopy,
  locale,
}: {
  project: PortfolioProject;
  uiData: ReturnType<typeof getUiContent>;
  sectionCopy: PortfolioSectionCopy;
  locale: Locale;
}) {
  return (
    <div className="group relative grid gap-8 rounded-xl lg:grid-cols-12 lg:items-center lg:gap-14">
      <div className="lg:col-span-7">
        <CaseVisual
          slug={project.slug}
          imageSrc={project.coverImage?.variants.lg ?? null}
          alt={project.coverImage?.alt || project.title}
          industryIcon={project.industryIcon}
          url={getProjectHostname(project)}
          sizes="(max-width: 1024px) 100vw, 700px"
          className="transition-colors duration-300 group-hover:border-foreground/25"
        />
      </div>

      <div className="flex flex-col lg:col-span-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-foreground/60">{pad(1)}</span>
          <span aria-hidden="true" className="h-px w-8 bg-foreground/20" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent-strong">
            {sectionCopy.featuredBadge}
          </span>
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-foreground/70">{project.clientLabel}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-3xl">
          <Link href={portfolioCasePath(locale, project.slug)} className={STRETCH}>
            {project.title}
          </Link>
          {!project.translated && <EsBadge />}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">{project.summary}</p>

        {project.capabilities.length > 0 && (
          <ul
            aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
            className="mt-5 flex flex-wrap gap-2"
          >
            {project.capabilities.map((capability) => (
              <li key={capability} className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/70">
                {capability}
              </li>
            ))}
          </ul>
        )}

        <span aria-hidden="true" className="mt-7 inline-flex items-center gap-3 text-sm font-semibold text-foreground">
          {sectionCopy.viewCaseStudy}
          <CaseArrow />
        </span>
      </div>
    </div>
  );
}

function SecondaryCase({
  project,
  number,
  sectionCopy,
  locale,
}: {
  project: PortfolioProject;
  number: number;
  sectionCopy: PortfolioSectionCopy;
  locale: Locale;
}) {
  return (
    <div className="group relative flex h-full flex-col rounded-xl">
      <CaseVisual
        slug={project.slug}
        imageSrc={project.coverImage?.variants.md ?? null}
        alt={project.coverImage?.alt || project.title}
        industryIcon={project.industryIcon}
        url={getProjectHostname(project)}
        sizes="(max-width: 640px) 100vw, 560px"
        className="transition-colors duration-300 group-hover:border-foreground/25"
      />

      <div className="mt-6 flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-foreground/60">{pad(number)}</span>
          <span aria-hidden="true" className="h-px w-6 bg-foreground/20" />
          <span className="truncate text-xs font-medium uppercase tracking-wide text-foreground/70">
            {project.clientLabel.split("·")[0].trim()}
          </span>
        </div>
        <h3 className="mt-3 text-xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-2xl">
          <Link href={portfolioCasePath(locale, project.slug)} className={STRETCH}>
            {project.title}
          </Link>
          {!project.translated && <EsBadge />}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground/80">{project.summary}</p>
        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-3 pt-5 text-sm font-semibold text-foreground">
          {sectionCopy.exploreProject}
          <CaseArrow />
        </span>
      </div>
    </div>
  );
}

export function Portfolio({
  locale = defaultLocale,
  projects,
}: {
  locale?: Locale;
  projects: PortfolioProject[];
}) {
  const reduced = Boolean(useReducedMotion());
  const sectionCopy = getPortfolioSectionContent(locale);
  const uiData = getUiContent(locale);

  if (projects.length === 0) return null;

  // El destacado es el que el equipo marcó como tal desde el dashboard
  // (`is_featured`), no simplemente el primero de la lista por `sort_order`.
  const featured = projects.find((project) => project.isFeatured) ?? projects[0];
  const secondary = projects.filter((project) => project.slug !== featured.slug).slice(0, SECONDARY_COUNT);

  return (
    <section
      id="portfolio"
      aria-label={uiData.portfolioSectionAria}
      className="scroll-mt-24 border-y border-foreground/5 bg-foreground/[0.02] px-6 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{sectionCopy.badge}</SectionEyebrow>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{sectionCopy.title}</h2>
            <p className="mt-3 text-base text-foreground/80 sm:text-lg">{sectionCopy.description}</p>
          </div>

          <Button href={portfolioIndexPath(locale)} variant="secondary" size="sm" className="shrink-0">
            {sectionCopy.viewAll}
          </Button>
        </div>

        <motion.div
          variants={staggerContainer(reduced, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col gap-14 lg:gap-20"
        >
          <motion.div variants={fadeUp(reduced)}>
            <FeaturedCase project={featured} uiData={uiData} sectionCopy={sectionCopy} locale={locale} />
          </motion.div>

          {secondary.length > 0 && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:gap-x-12">
              {secondary.map((project, index) => (
                <motion.div key={project.slug} variants={fadeUp(reduced)}>
                  <SecondaryCase
                    project={project}
                    number={index + 2}
                    sectionCopy={sectionCopy}
                    locale={locale}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Botón para explorar el catálogo completo de proyectos */}
          <div className="flex justify-center pt-4">
            <Button href={portfolioIndexPath(locale)} variant="secondary" size="lg">
              {sectionCopy.viewAll}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
