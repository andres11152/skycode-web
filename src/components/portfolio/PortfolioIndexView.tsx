"use client";

import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { TechIcon } from "@/components/portfolio/TechIcon";
import { fadeUp, scaleUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { getProjectHostname, type PortfolioIndexItem, type PortfolioTechnology } from "@/content/portfolioShared";
import type { PortfolioSectionCopy } from "@/content/projects";
import { portfolioCasePath } from "@/lib/portfolioPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";

const FOCUS_LIGHT =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
// Enlace estirado: el <a> es solo el título (su nombre accesible coincide con el texto
// visible, WCAG 2.5.3) y su ::after cubre la tarjeta entera, así toda ella es clicable.
// El anillo de foco se dibuja en ese ::after (el <a> en sí queda sin caja visible).
const STRETCH_LIGHT =
  "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background";
const STRETCH_DARK =
  "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-foreground";

const VIEWPORT = { once: true, margin: "-80px" } as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function FeaturedCase({
  project,
  copy,
  locale,
}: {
  project: PortfolioIndexItem;
  copy: PortfolioSectionCopy;
  locale: Locale;
}) {
  return (
    // Banda oscura (bg-foreground): una de las secciones invertidas del sitio.
    // No hay otra oscura contigua en esta página — el resto de capítulos son claros.
    <section aria-label={copy.featuredBadge} className="mt-14 bg-foreground sm:mt-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="group relative grid gap-10 rounded-xl py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24">
          <div className="lg:col-span-7">
            <CaseVisual
              slug={project.slug}
              imageSrc={project.coverImage?.variants.lg ?? null}
              blurDataURL={project.coverImage?.blurDataURL}
              color={project.coverImage?.color}
              alt={project.coverImage?.alt || project.title}
              industryIcon={project.industryIcon}
              url={getProjectHostname(project)}
              sizes="(max-width: 1024px) 100vw, 700px"
              priority
              parallax
              onDark
            />
          </div>

          <div className="flex flex-col lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-background/70">{pad(1)}</span>
              <span aria-hidden="true" className="h-px w-8 bg-background/25" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">
                {copy.featuredBadge}
              </span>
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-background/70">
              {project.clientLabel}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance text-background sm:text-4xl">
              <Link href={portfolioCasePath(locale, project.slug)} className={STRETCH_DARK}>
                {project.title}
              </Link>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-background/80 sm:text-lg">{project.summary}</p>

            {project.capabilities.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {project.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="rounded-full border border-background/15 px-3 py-1 text-xs text-background/80"
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            )}

            <span aria-hidden="true" className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-background">
              {copy.viewCaseStudy}
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-background/25 transition-colors duration-200 group-hover:border-background group-hover:bg-background group-hover:text-foreground"
              >
                <ArrowUpRight
                  size={18}
                  className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CaseChapter({
  project,
  number,
  flip,
  reduced,
  copy,
  locale,
}: {
  project: PortfolioIndexItem;
  number: number;
  flip: boolean;
  reduced: boolean;
  copy: PortfolioSectionCopy;
  locale: Locale;
}) {
  return (
    <article className="border-t border-foreground/10">
      <div className="group relative grid gap-8 rounded-xl py-12 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-16">
        <motion.div
          variants={scaleUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className={cn("lg:col-span-7", flip && "lg:order-2")}
        >
          <CaseVisual
            slug={project.slug}
            imageSrc={project.coverImage?.variants.lg ?? null}
            blurDataURL={project.coverImage?.blurDataURL}
            color={project.coverImage?.color}
            alt={project.coverImage?.alt || project.title}
            industryIcon={project.industryIcon}
            url={getProjectHostname(project)}
            sizes="(max-width: 1024px) 100vw, 700px"
            parallax
            className="transition-colors duration-300 group-hover:border-foreground/25"
          />
        </motion.div>

        <motion.div
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="flex flex-col lg:col-span-5"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-foreground/60">{pad(number)}</span>
            <span aria-hidden="true" className="h-px w-8 bg-foreground/20" />
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
              {project.clientLabel}
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-4xl">
            <Link href={portfolioCasePath(locale, project.slug)} className={STRETCH_LIGHT}>
              {project.title}
            </Link>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/80">{project.summary}</p>

          {project.capabilities.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {project.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/70"
                >
                  {capability}
                </li>
              ))}
            </ul>
          )}

          <span aria-hidden="true" className="mt-7 inline-flex items-center gap-3 text-sm font-semibold text-foreground">
            {copy.viewCaseStudy}
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 transition-colors duration-200 group-hover:border-accent-strong group-hover:bg-accent-strong group-hover:text-accent-foreground"
            >
              <ArrowUpRight
                size={18}
                className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
              />
            </span>
          </span>
        </motion.div>
      </div>
    </article>
  );
}

export function PortfolioIndexView({
  locale,
  projects,
  technologies,
  sectionCopy,
}: {
  locale: Locale;
  projects: PortfolioIndexItem[];
  /** Las más usadas entre los casos, calculadas en el servidor. */
  technologies: PortfolioTechnology[];
  sectionCopy: PortfolioSectionCopy;
}) {
  const reduced = Boolean(useReducedMotion());

  const featured = projects.find((project) => project.isFeatured) ?? projects[0];
  const rest = featured ? projects.filter((project) => project.slug !== featured.slug) : [];
  const homeHref = localeHomePath(locale);
  const contactHref = `${homeHref === "/" ? "" : homeHref}/#contacto`;

  return (
    <main id="main-content" className="pt-28 sm:pt-36">
      <header className="mx-auto max-w-6xl px-6">
        <nav aria-label={sectionCopy.breadcrumb.aria}>
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link href={homeHref} className={cn("rounded hover:text-foreground", FOCUS_LIGHT)}>
                {sectionCopy.breadcrumb.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{sectionCopy.breadcrumb.portfolio}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-8">
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              {sectionCopy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/80">
              {sectionCopy.description}
            </p>
          </div>

          {projects.length > 0 && (
            <div className="flex flex-col gap-5 lg:col-span-4 lg:items-end">
              <p className="flex items-baseline gap-3 lg:flex-col lg:items-end lg:gap-0">
                <span className="font-mono text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                  {pad(projects.length)}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                  {sectionCopy.index.countLabel}
                </span>
              </p>
              {technologies.length > 0 && (
                <ul aria-label={sectionCopy.index.stackLabel} className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                  {technologies.map((technology) => (
                    <li key={technology.id} title={technology.name} className="flex items-center">
                      <TechIcon technology={technology} size={20} />
                      <span className="sr-only">{technology.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </header>

      {!featured ? (
        <p className="mx-auto max-w-6xl px-6 py-24 text-lg text-foreground/80">{sectionCopy.index.empty}</p>
      ) : (
        <>
          <FeaturedCase project={featured} copy={sectionCopy} locale={locale} />

          {rest.length > 0 && (
            <div className="mx-auto max-w-6xl px-6 pt-8 sm:pt-12">
              {rest.map((project, index) => (
                <CaseChapter
                  key={project.slug}
                  project={project}
                  number={index + 2}
                  flip={index % 2 === 1}
                  reduced={reduced}
                  copy={sectionCopy}
                  locale={locale}
                />
              ))}
            </div>
          )}

          <section aria-label={sectionCopy.index.ctaTitle} className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
            <div className="flex flex-col gap-6 border-t border-foreground/10 pt-12 sm:flex-row sm:items-center sm:justify-between sm:pt-16">
              <p className="max-w-xl text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
                {sectionCopy.index.ctaTitle}
              </p>
              <Button href={contactHref} variant="accent" size="lg" className="shrink-0">
                {sectionCopy.index.ctaButton}
              </Button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
