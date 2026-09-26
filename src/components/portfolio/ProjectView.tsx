"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowSquareOut, CheckCircle, CornersOut } from "@phosphor-icons/react";
import { m as motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { Lightbox } from "@/components/ui/Lightbox";
import { TechIcon } from "@/components/portfolio/TechIcon";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getPortfolioIcon, type PortfolioProject } from "@/content/portfolioShared";

// Prácticas reales, ya establecidas en TrustStrip (content/locales/es/trust.json) —
// se reusan aquí tal cual, no se inventan métricas ni resultados específicos por
// cliente (los clientes son confidenciales, ver lib/queries/portfolio.ts).
const APPROACH_ITEMS = [
  "Buenas prácticas OWASP",
  "Cumplimiento normativo de datos",
  "Documentación técnica incluida",
  "Código 100% transferible",
];

const COVER_ASPECT = "aspect-[16/9] sm:aspect-[21/9]";

interface NextProjectLink {
  slug: string;
  title: string;
}

export function ProjectView({
  project,
  nextProject,
}: {
  project: PortfolioProject;
  nextProject: NextProjectLink | null;
}) {
  const reduced = Boolean(useReducedMotion());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const galleryImages = project.images.length > 0 ? project.images : [];

  // Sin envolver cada slide en una relación de aspecto fija (16:9/21:9,
  // ver COVER_ASPECT más abajo) — eso forzaba letterboxing exagerado en
  // capturas con otra proporción y hacía que el zoom del Lightbox
  // ampliara ese espacio vacío en vez de detalle real. El lienzo del
  // Lightbox ya define un tamaño grande y consistente (ver Lightbox.tsx);
  // acá cada slide solo necesita llenarlo con `object-contain`.
  const slides = galleryImages.length > 0
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

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <motion.div
        variants={staggerContainer(reduced)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-6xl flex-col gap-10"
      >
        <nav aria-label="Ruta de navegación">
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
            <li>
              <Link
                href="/portafolio"
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Portafolio
              </Link>
            </li>
          </ol>
        </nav>

        <div className="group relative">
          <ProjectCover
            icon={getPortfolioIcon(project.industryIcon)}
            imageSrc={project.coverImage?.variants.lg}
            className={`${COVER_ASPECT} w-full rounded-xl`}
            iconClassName="h-20 w-20 sm:h-24 sm:w-24"
            priority={true}
          />
          <button
            type="button"
            onClick={() => {
              setLightboxIndex(0);
              setLightboxOpen(true);
            }}
            aria-label="Ampliar imagen"
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/10 text-background outline-none backdrop-blur-sm transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <CornersOut size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {project.capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground/70"
                  >
                    {capability}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {project.title}
              </h1>
            </header>

            <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">
              {project.summary}
            </p>

            {project.technologies.length > 0 && (
              <motion.div variants={fadeUp(reduced)} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Stack tecnológico
                </h2>
                <ul className="flex flex-wrap gap-3">
                  {project.technologies.map((technology) => (
                    <li
                      key={technology.id}
                      title={technology.name}
                      className="flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 text-xs font-medium text-foreground/80"
                    >
                      <TechIcon technology={technology} size={16} />
                      {technology.name}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {(project.challenge || project.solution || project.results) && (
              <motion.div variants={fadeUp(reduced)} className="grid gap-6 sm:grid-cols-3">
                {project.challenge && (
                  <div className="rounded-xl border border-foreground/10 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">El reto</h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{project.challenge}</p>
                  </div>
                )}
                {project.solution && (
                  <div className="rounded-xl border border-foreground/10 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">La solución</h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{project.solution}</p>
                  </div>
                )}
                {project.results && (
                  <div className="rounded-xl border border-foreground/10 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Los resultados</h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{project.results}</p>
                  </div>
                )}
              </motion.div>
            )}

            {project.metrics.length > 0 && (
              <motion.div variants={fadeUp(reduced)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {project.metrics.map((metric, index) => (
                  <div key={`${metric.label}-${index}`} className="rounded-xl border border-accent/20 bg-accent/[0.04] p-5 text-center">
                    <p className="text-2xl font-bold tracking-tight text-accent-strong">{metric.value}</p>
                    <p className="mt-1 text-xs text-foreground/70">{metric.label}</p>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div variants={fadeUp(reduced)} className="rounded-xl border border-foreground/10 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                En este proyecto, como en todos, aplicamos
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {APPROACH_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <CheckCircle size={16} className="shrink-0 text-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {galleryImages.length > 0 && (
              <motion.div variants={fadeUp(reduced)} className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Capturas de la plataforma ({galleryImages.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                      className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5 outline-none transition-all hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Image
                        src={image.variants.sm}
                        alt={image.alt || `${project.title} — captura ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                        <CornersOut size={16} className="text-background" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <motion.aside
            variants={fadeUp(reduced)}
            className="flex flex-col gap-6 lg:sticky lg:top-28 lg:h-fit"
          >
            <div className="rounded-xl border border-foreground/10 p-6">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                Cliente
              </span>
              <p className="mt-1 text-sm text-foreground/80">{project.clientLabel}</p>

              {project.liveUrl && (
                <Button href={project.liveUrl} variant="secondary" size="md" className="mt-5 w-full">
                  Visitar sitio en vivo
                  <ArrowSquareOut size={16} />
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
              <p className="text-base font-medium text-foreground">
                ¿Tiene un proyecto similar en mente?
              </p>
              <Button href="/#contacto" variant="accent" size="md" className="mt-4 w-full">
                Hablar con un ingeniero
              </Button>
            </div>

            {nextProject && (
              <Link
                href={`/portafolio/${nextProject.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-foreground/10 p-6 outline-none transition-colors hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                    Siguiente proyecto
                  </span>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-accent-strong">
                    {nextProject.title}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-strong"
                />
              </Link>
            )}
          </motion.aside>
        </div>

        <motion.div variants={fadeUp(reduced)} className="border-t border-foreground/10 pt-8">
          <Link
            href="/portafolio"
            className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={14} />
            Volver al portafolio
          </Link>
        </motion.div>
      </motion.div>

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
