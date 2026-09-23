"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowSquareOut, ArrowUpRight } from "@phosphor-icons/react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Magnetic } from "@/components/ui/Magnetic";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { EsBadge } from "@/components/ui/EsBadge";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { getProjectsContent, type Project } from "@/content/projects";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

function ProjectRow({
  project,
  index,
  reduced,
  uiData,
  showEsBadge,
}: {
  project: Project;
  index: number;
  reduced: boolean;
  uiData: ReturnType<typeof getUiContent>;
  showEsBadge: boolean;
}) {
  return (
    <SpotlightCard>
      <Link
        href={`/portafolio/${project.slug}`}
        data-cursor="project"
        data-cursor-text="Ver Proyecto ↗"
        aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-foreground/10 py-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[2.5rem_5rem_1fr_auto] sm:gap-6 sm:py-8"
      >
        <span
          aria-hidden="true"
          className="hidden font-mono text-sm text-foreground/30 sm:block"
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <ProjectCover
          icon={project.coverIcon}
          imageSrc={project.coverImage}
          className="hidden h-16 w-16 shrink-0 rounded-xl transition-transform duration-300 ease-out group-hover:scale-105 sm:flex sm:h-20 sm:w-20"
        />

        <div className="col-span-2 min-w-0 sm:col-span-1">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            {project.client}
          </span>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent sm:text-2xl">
            {project.title}
            {showEsBadge && <EsBadge />}
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm text-foreground/70 line-clamp-2">
            {project.description}
          </p>
          <ul
            aria-label={t(uiData.portfolioTechUsed, { title: project.title })}
            className="mt-3 flex flex-wrap gap-2"
          >
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-foreground/70"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 self-start justify-self-end sm:self-center">
          {project.link && (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60"
            >
              <ArrowSquareOut size={16} />
            </span>
          )}
          <Magnetic strength={0.35} range={50}>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-all duration-300 ease-out",
                "group-hover:border-accent/40 group-hover:bg-accent/10 group-hover:text-accent group-hover:scale-110",
                reduced ? "" : "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
              )}
            >
              <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:rotate-12" />
            </span>
          </Magnetic>
        </div>
      </Link>
    </SpotlightCard>
  );
}

export function Portfolio({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const { projects, projectsSection } = getProjectsContent(locale);
  const uiData = getUiContent(locale);

  return (
    <section
      id="portfolio"
      aria-label={uiData.portfolioSectionAria}
      className="scroll-mt-24 bg-foreground/[0.03] px-6 py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 max-w-xl">
          <SectionEyebrow className="mb-3">{projectsSection.badge}</SectionEyebrow>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {projectsSection.title}
          </h2>
          <p className="mt-3 text-foreground/80">{projectsSection.description}</p>
        </div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col border-t border-foreground/10"
        >
          {projects.map((project, index) => (
            <motion.div key={project.slug} variants={fadeUp(reduced)}>
              <ProjectRow
                project={project}
                index={index}
                reduced={reduced}
                uiData={uiData}
                showEsBadge={locale !== "es"}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
