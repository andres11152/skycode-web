"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { ArrowSquareOut, ArrowUpRight } from "@phosphor-icons/react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Button } from "@/components/ui/Button";
import { EsBadge } from "@/components/ui/EsBadge";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getProjectsContent, type Project } from "@/content/projects";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

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

function FeaturedProjectCard({
  project,
  uiData,
  showEsBadge,
}: {
  project: Project;
  uiData: ReturnType<typeof getUiContent>;
  showEsBadge: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-foreground/10 bg-background transition-all duration-300 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5">
      <Link
        href={`/portafolio/${project.slug}`}
        aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
        className="grid grid-cols-1 lg:grid-cols-12 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* Visual Preview */}
        <div className="lg:col-span-7 bg-foreground/5">
          <BrowserFrame url={project.link ? new URL(project.link).hostname : `skycode.agency/cases/${project.slug}`}>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-foreground/10 sm:min-h-[320px]">
              {project.coverImage ? (
                <Image
                  src={project.coverImage}
                  alt={project.title}
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
                {project.client.split("·")[0].trim()}
              </span>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent-strong">
                Caso Destacado
              </span>
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-2xl">
              {project.title}
              {showEsBadge && <EsBadge />}
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-foreground/75">
              {project.description}
            </p>

            <ul
              aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
              className="mt-4 flex flex-wrap gap-1.5"
            >
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 font-mono text-[11px] text-foreground/80"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-2 font-heading text-sm font-bold text-accent">
            <span>Ver caso de estudio</span>
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
  showEsBadge,
}: {
  project: Project;
  uiData: ReturnType<typeof getUiContent>;
  showEsBadge: boolean;
}) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-foreground/10 bg-background transition-all duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5">
      <Link
        href={`/portafolio/${project.slug}`}
        aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <BrowserFrame url={project.link ? new URL(project.link).hostname : `skycode.agency/cases/${project.slug}`}>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-foreground/10">
            {project.coverImage ? (
              <Image
                src={project.coverImage}
                alt={project.title}
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
              {project.client.split("·")[0].trim()}
            </span>

            <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-accent sm:text-xl">
              {project.title}
              {showEsBadge && <EsBadge />}
            </h3>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-foreground/75 line-clamp-3">
              {project.description}
            </p>

            <ul
              aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
              className="mt-4 flex flex-wrap gap-1.5"
            >
              {project.tags.slice(0, 4).map((tag) => (
                <li
                  key={tag}
                  className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-foreground/75"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-foreground/5 pt-4">
            <span className="font-heading text-xs font-bold text-accent group-hover:underline">
              Explorar proyecto
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

export function Portfolio({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const { projects, projectsSection } = getProjectsContent(locale);
  const uiData = getUiContent(locale);

  const [featured, ...otherProjects] = projects;

  return (
    <section
      id="portfolio"
      aria-label={uiData.portfolioSectionAria}
      className="scroll-mt-24 border-y border-foreground/5 bg-foreground/[0.02] px-6 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{projectsSection.badge}</SectionEyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {projectsSection.title}
            </h2>
            <p className="mt-3 text-base text-foreground/80 sm:text-lg">{projectsSection.description}</p>
          </div>

          <Button href="/portafolio" variant="secondary" size="sm" className="shrink-0">
            {projectsSection.viewAll}
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
          {featured && (
            <motion.div variants={fadeUp(reduced)}>
              <FeaturedProjectCard
                project={featured}
                uiData={uiData}
                showEsBadge={locale !== "es"}
              />
            </motion.div>
          )}

          {/* Grid for Remaining Projects */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {otherProjects.map((project) => (
              <motion.div key={project.slug} variants={fadeUp(reduced)}>
                <ProjectCard
                  project={project}
                  uiData={uiData}
                  showEsBadge={locale !== "es"}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
