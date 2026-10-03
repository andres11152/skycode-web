"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowSquareOut, CheckCircle, CornersOut } from "@phosphor-icons/react";
import { m as motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Lightbox } from "@/components/ui/Lightbox";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { GalleryRail } from "@/components/portfolio/GalleryRail";
import { NextCase, type NextCaseData } from "@/components/portfolio/NextCase";
import { TechIcon } from "@/components/portfolio/TechIcon";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { getPortfolioIcon, getProjectHostname, type PortfolioProject } from "@/content/portfolioShared";
import type { PortfolioDetailCopy } from "@/content/projects";

const WRAP = "mx-auto w-full max-w-6xl px-6";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const VIEWPORT = { once: true, margin: "-80px" } as const;

export function ProjectView({
  project,
  nextProject,
  copy,
}: {
  project: PortfolioProject;
  nextProject: NextCaseData | null;
  copy: PortfolioDetailCopy;
}) {
  const reduced = Boolean(useReducedMotion());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const galleryImages = project.images;
  const hostname = getProjectHostname(project);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // El lienzo del Lightbox ya define un tamaño grande y consistente (ver
  // Lightbox.tsx): cada slide solo lo llena con `object-contain`, sin forzar
  // una relación de aspecto que haría letterboxing exagerado al hacer zoom.
  const slides =
    galleryImages.length > 0
      ? galleryImages.map((image, index) => (
          <div key={image.id} className="relative h-full w-full">
            <Image
              src={image.variants.lg}
              alt={image.alt || `${project.title} — captura ${index + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        ))
      : [
          <ProjectCover
            key="cover"
            icon={getPortfolioIcon(project.industryIcon)}
            imageSrc={project.coverImage?.variants.lg}
            className="h-full w-full"
            iconClassName="h-24 w-24"
          />,
        ];

  const chapters = [
    { key: "challenge", label: copy.challenge, body: project.challenge },
    { key: "solution", label: copy.solution, body: project.solution },
    { key: "results", label: copy.results, body: project.results },
  ].filter((chapter) => chapter.body.trim().length > 0);

  return (
    <main id="main-content" className="pt-28 sm:pt-36">
      <ScrollProgress />

      {/* Cabecera: sin animación de entrada — el h1 y el resumen pueden ser el LCP. */}
      <header className={WRAP}>
        <nav aria-label="Ruta de navegación">
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link href="/" className={cn("rounded hover:text-foreground", FOCUS)}>
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/portafolio" className={cn("rounded hover:text-foreground", FOCUS)}>
                Portafolio
              </Link>
            </li>
          </ol>
        </nav>

        <h1 className="mt-8 max-w-4xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
          {project.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-foreground/80 sm:text-xl">{project.summary}</p>
      </header>

      <div className={cn(WRAP, "mt-12 sm:mt-16")}>
        <div className="relative">
          <CaseVisual
            slug={project.slug}
            imageSrc={project.coverImage?.variants.lg ?? null}
            alt={project.coverImage?.alt || project.title}
            industryIcon={project.industryIcon}
            url={hostname}
            sizes="(max-width: 1152px) 100vw, 1152px"
            aspectClassName="aspect-[16/10] sm:aspect-[16/9] lg:aspect-[2/1]"
            priority
          />
          <button
            type="button"
            onClick={() => openLightbox(0)}
            aria-label={copy.expandImage}
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/60 text-background outline-none backdrop-blur-sm transition-colors hover:bg-foreground/75 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <CornersOut size={18} />
          </button>
        </div>

        {/* Datos clave: fila editorial con divisores, no una sidebar. */}
        <dl
          className={cn(
            "mt-10 grid gap-x-8 gap-y-6 border-y border-foreground/10 py-8 sm:grid-cols-2",
            project.liveUrl ? "lg:grid-cols-3" : "lg:grid-cols-2",
          )}
        >
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.client}</dt>
            <dd className="mt-2 text-base text-foreground">{project.clientLabel}</dd>
          </div>
          {project.capabilities.length > 0 && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.capabilities}</dt>
              <dd className="mt-2 text-base text-foreground">{project.capabilities.join(" · ")}</dd>
            </div>
          )}
          {project.liveUrl && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.liveSite}</dt>
              <dd className="mt-2">
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded text-base font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground",
                    FOCUS,
                  )}
                >
                  {hostname}
                  <ArrowSquareOut size={16} aria-hidden="true" />
                  <span className="sr-only">{copy.visitSite}</span>
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {project.technologies.length > 0 && (
        <motion.section
          aria-label={copy.stack}
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className={cn(WRAP, "mt-10")}
        >
          <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.stack}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {project.technologies.map((technology) => (
              <li
                key={technology.id}
                className="flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-3.5 py-2 text-sm font-medium text-foreground/80"
              >
                <TechIcon technology={technology} size={18} />
                {technology.name}
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Capítulos: etiqueta fija a la izquierda, texto grande a la derecha. Solo si hay contenido real. */}
      {chapters.length > 0 && (
        <div className={cn(WRAP, "mt-16 sm:mt-24")}>
          {chapters.map((chapter, index) => (
            <motion.section
              key={chapter.key}
              aria-labelledby={`chapter-${chapter.key}`}
              variants={fadeUp(reduced)}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
              className="grid gap-4 border-t border-foreground/10 py-10 sm:py-14 lg:grid-cols-[14rem_1fr] lg:gap-16"
            >
              <div className="lg:sticky lg:top-28 lg:h-fit">
                <span className="font-mono text-sm text-foreground/60">{String(index + 1).padStart(2, "0")}</span>
                <h2
                  id={`chapter-${chapter.key}`}
                  className="mt-1 text-2xl font-bold tracking-tight text-foreground"
                >
                  {chapter.label}
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80 sm:text-xl">{chapter.body}</p>
            </motion.section>
          ))}
        </div>
      )}

      {/* Métricas: banda oscura de énfasis. Las galería/siguiente caso que la rodean son claras. */}
      {project.metrics.length > 0 && (
        <section aria-label={copy.metrics} className="mt-16 bg-foreground sm:mt-24">
          <div className={cn(WRAP, "py-16 sm:py-24")}>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">{copy.metrics}</h2>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {project.metrics.map((metric, index) => (
                <motion.div
                  key={`${metric.label}-${index}`}
                  variants={fadeUp(reduced)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT}
                  className="flex flex-col-reverse justify-end border-l border-background/15 pl-5"
                >
                  <dt className="mt-2 text-sm leading-snug text-background/80">{metric.label}</dt>
                  <dd className="text-4xl font-bold tracking-tight text-background sm:text-5xl">{metric.value}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {galleryImages.length > 0 && (
        <motion.section
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className={cn(WRAP, "mt-16 sm:mt-24")}
        >
          <GalleryRail
            images={galleryImages}
            title={copy.gallery}
            regionLabel={copy.galleryRegion}
            prevLabel={copy.galleryPrev}
            nextLabel={copy.galleryNext}
            expandLabel={copy.expandImage}
            onOpen={openLightbox}
          />
        </motion.section>
      )}

      <section aria-label={copy.approachTitle} className={cn(WRAP, "mt-16 sm:mt-24")}>
        <div className="border-y border-foreground/10 py-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.approachTitle}</h2>
          <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            {copy.approach.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                <CheckCircle size={16} className="shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-16 sm:mt-24">
        {nextProject && <NextCase next={nextProject} label={copy.nextCase} />}
      </div>

      <section aria-label={copy.ctaTitle} className={cn(WRAP, "pb-24 sm:pb-32", !nextProject && "mt-8")}>
        <div className="flex flex-col gap-6 border-t border-foreground/10 pt-12 sm:flex-row sm:items-center sm:justify-between sm:pt-16">
          <p className="max-w-xl text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
            {copy.ctaTitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="/portafolio" variant="secondary" size="lg">
              {copy.viewAllCases}
            </Button>
            <Button href="/#contacto" variant="accent" size="lg">
              {copy.ctaButton}
            </Button>
          </div>
        </div>
      </section>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </main>
  );
}
