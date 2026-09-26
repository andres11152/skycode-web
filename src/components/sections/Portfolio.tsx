"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Button } from "@/components/ui/Button";
import { EsBadge } from "@/components/ui/EsBadge";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getPortfolioSectionContent, type PortfolioSectionCopy } from "@/content/projects";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t, type Locale } from "@/lib/i18n";
import type { PortfolioProject } from "@/content/portfolioShared";

function BrowserFrame({
  children,
  url,
}: {
  children: React.ReactNode;
  url?: string;
}) {
  return (
    <div className="overflow-hidden rounded-t-xl border-b border-foreground/10 bg-foreground/[0.04]">
      {/* Browser chrome header */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground/20" />
          <span className="h-2 w-2 rounded-full bg-foreground/20" />
          <span className="h-2 w-2 rounded-full bg-foreground/20" />
        </div>
        {url && (
          <span className="max-w-[200px] truncate rounded bg-foreground/5 px-2 py-0.5 font-mono text-[10px] text-foreground/50 sm:max-w-xs">
            {url}
          </span>
        )}
        <div className="w-6" />
      </div>
      {children}
    </div>
  );
}

function projectHostname(project: PortfolioProject): string {
  if (!project.liveUrl) return `skycode.agency/cases/${project.slug}`;
  try {
    return new URL(project.liveUrl).hostname;
  } catch {
    return `skycode.agency/cases/${project.slug}`;
  }
}

function FeaturedProjectCard({
  project,
  uiData,
  sectionCopy,
  showEsBadge,
}: {
  project: PortfolioProject;
  uiData: ReturnType<typeof getUiContent>;
  sectionCopy: PortfolioSectionCopy;
  showEsBadge: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-foreground/10 bg-background transition-all duration-300 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5">
      <Link
        href={`/portafolio/${project.slug}`}
        aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
        className="grid grid-cols-1 lg:grid-cols-12 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Visual Preview */}
        <div className="lg:col-span-7 bg-foreground/5">
          <BrowserFrame url={projectHostname(project)}>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-foreground/10 sm:min-h-[320px]">
              {project.coverImage ? (
                <Image
                  src={project.coverImage.variants.md}
                  alt={project.coverImage.alt || project.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-40 transition-opacity group-hover:opacity-10" />
            </div>
          </BrowserFrame>
        </div>

        {/* Content details */}
        <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-strong">
                {project.clientLabel.split("·")[0].trim()}
              </span>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent-strong">
                {sectionCopy.featuredBadge}
              </span>
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-2xl">
              {project.title}
              {showEsBadge && <EsBadge />}
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              {project.summary}
            </p>

            <ul
              aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
              className="mt-4 flex flex-wrap gap-1.5"
            >
              {project.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 font-mono text-[11px] text-foreground/80"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-2 font-heading text-sm font-bold text-accent">
            <span>{sectionCopy.viewCaseStudy}</span>
            <ArrowUpRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

function ProjectCard({
  project,
  uiData,
  sectionCopy,
  showEsBadge,
}: {
  project: PortfolioProject;
  uiData: ReturnType<typeof getUiContent>;
  sectionCopy: PortfolioSectionCopy;
  showEsBadge: boolean;
}) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-foreground/10 bg-background transition-all duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5">
      <Link
        href={`/portafolio/${project.slug}`}
        aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <BrowserFrame url={projectHostname(project)}>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-foreground/10">
            {project.coverImage ? (
              <Image
                src={project.coverImage.variants.md}
                alt={project.coverImage.alt || project.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-40 transition-opacity group-hover:opacity-10" />
          </div>
        </BrowserFrame>

        <div className="flex flex-1 flex-col justify-between p-6">
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground/60">
              {project.clientLabel.split("·")[0].trim()}
            </span>

            <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-xl">
              {project.title}
              {showEsBadge && <EsBadge />}
            </h3>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-foreground/75 line-clamp-3">
              {project.summary}
            </p>

            <ul
              aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
              className="mt-4 flex flex-wrap gap-1.5"
            >
              {project.capabilities.slice(0, 4).map((capability) => (
                <li
                  key={capability}
                  className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-foreground/75"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-foreground/5 pt-4">
            <span className="font-heading text-xs font-bold text-accent group-hover:underline">
              {sectionCopy.exploreProject}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </Link>
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
  // (`is_featured`), no simplemente el primero de la lista por `sort_order`
  // — antes (con el JSON estático) el primer ítem del array cumplía ambos
  // roles a la vez, acá ya no es necesariamente así.
  const featured = projects.find((project) => project.isFeatured) ?? projects[0];
  const otherProjects = projects.filter((project) => project.slug !== featured.slug);

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
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {sectionCopy.title}
            </h2>
            <p className="mt-3 text-base text-foreground/80 sm:text-lg">{sectionCopy.description}</p>
          </div>

          <Button href="/portafolio" variant="secondary" size="sm" className="shrink-0">
            {sectionCopy.viewAll}
          </Button>
        </div>

        <motion.div
          variants={staggerContainer(reduced, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col gap-8"
        >
          {/* Flagship Featured Project */}
          <motion.div variants={fadeUp(reduced)}>
            <FeaturedProjectCard
              project={featured}
              uiData={uiData}
              sectionCopy={sectionCopy}
              showEsBadge={locale !== "es"}
            />
          </motion.div>

          {/* Grid for Remaining Projects */}
          {otherProjects.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
              {otherProjects.map((project) => (
                <motion.div key={project.slug} variants={fadeUp(reduced)}>
                  <ProjectCard
                    project={project}
                    uiData={uiData}
                    sectionCopy={sectionCopy}
                    showEsBadge={locale !== "es"}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
