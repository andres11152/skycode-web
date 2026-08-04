"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { projects, projectsSection } from "@/content/projects";
import { getUiContent } from "@/content/ui";
import { defaultLocale, t } from "@/lib/i18n";

export function PortfolioIndexView() {
  const reduced = Boolean(useReducedMotion());
  const uiData = getUiContent(defaultLocale);

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={staggerContainer(reduced)}
          initial="hidden"
          animate="visible"
          className="flex max-w-2xl flex-col items-start gap-4 text-left"
        >
          <motion.nav variants={fadeUp(reduced)} aria-label="Ruta de navegación">
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link
                  href="/"
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground">Portafolio</li>
            </ol>
          </motion.nav>

          <motion.h1
            variants={fadeUp(reduced)}
            className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl"
          >
            {projectsSection.title}
          </motion.h1>
          <motion.p variants={fadeUp(reduced)} className="max-w-2xl text-lg text-foreground/80">
            {projectsSection.description}
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 flex flex-col border-t border-foreground/10"
        >
          {projects.map((project, index) => (
            <motion.div key={project.slug} variants={fadeUp(reduced)}>
              <SpotlightCard>
                <Link
                  href={`/portafolio/${project.slug}`}
                  data-cursor="project"
                  data-cursor-text="Ver Proyecto ↗"
                  aria-label={`${uiData.portfolioViewCase}: ${project.title}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-foreground/10 py-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[2.5rem_5rem_1fr_auto] sm:gap-6 sm:py-8"
                >
                  <span aria-hidden="true" className="hidden font-mono text-sm text-foreground/60 sm:block">
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
                    <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent sm:text-2xl">
                      {project.title}
                    </h2>
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
                        <ExternalLink size={16} />
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-all duration-200 ease-out",
                        "group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent",
                        reduced ? "" : "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                      )}
                    >
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
