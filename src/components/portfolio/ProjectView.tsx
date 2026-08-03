"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Maximize2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { projects, getProjectBySlug } from "@/content/projects";
import { Button } from "@/components/ui/Button";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { Lightbox } from "@/components/ui/Lightbox";
import { fadeUp, staggerContainer } from "@/lib/animations";

// Prácticas reales, ya establecidas en TrustStrip (content/locales/es/trust.json) —
// se reusan aquí tal cual, no se inventan métricas ni resultados específicos por
// cliente (los clientes son confidenciales, ver content/projects.ts).
const APPROACH_ITEMS = [
  "Buenas prácticas OWASP",
  "Cumplimiento normativo de datos",
  "Documentación técnica incluida",
  "Código 100% transferible",
];

const COVER_ASPECT = "aspect-[16/9] sm:aspect-[21/9]";

export function ProjectView({ slug }: { slug: string }) {
  const reduced = Boolean(useReducedMotion());
  const project = getProjectBySlug(slug);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!project) {
    notFound();
  }

  const currentIndex = projects.findIndex((item) => item.slug === slug);
  const nextProject = projects[(currentIndex + 1) % projects.length];

  const slides = (project.gallery ?? []).length > 0
    ? (project.gallery ?? []).map((src, index) => (
        <div key={src} className={`relative ${COVER_ASPECT} w-full`}>
          <Image
            src={src}
            alt={`${project.title} — captura ${index + 1}`}
            fill
            sizes="90vw"
            className="object-contain"
          />
        </div>
      ))
    : [
        <ProjectCover
          key="cover"
          icon={project.coverIcon}
          imageSrc={project.coverImage}
          className={`${COVER_ASPECT} w-full`}
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
            <li>
              <Link
                href="/portafolio"
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Portafolio
              </Link>
            </li>
          </ol>
        </motion.nav>

        <motion.div variants={fadeUp(reduced)} className="group relative">
          <ProjectCover
            icon={project.coverIcon}
            imageSrc={project.coverImage}
            className={`${COVER_ASPECT} w-full rounded-xl`}
            iconClassName="h-20 w-20 sm:h-24 sm:w-24"
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
            <Maximize2 size={18} />
          </button>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <motion.header variants={fadeUp(reduced)} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {project.title}
              </h1>
            </motion.header>

            <motion.p
              variants={fadeUp(reduced)}
              className="max-w-2xl text-lg leading-relaxed text-foreground/80"
            >
              {project.description}
            </motion.p>

            <motion.div variants={fadeUp(reduced)} className="rounded-xl border border-foreground/10 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                En este proyecto, como en todos, aplicamos
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {APPROACH_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <CheckCircle2 size={16} className="shrink-0 text-accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {project.gallery && project.gallery.length > 0 && (
              <motion.div variants={fadeUp(reduced)} className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Capturas de la plataforma ({project.gallery.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {project.gallery.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                      className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5 outline-none transition-all hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Image
                        src={src}
                        alt={`${project.title} — captura ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                        <Maximize2 size={16} className="text-background" />
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
              <p className="mt-1 text-sm text-foreground/80">{project.client}</p>

              {project.link && (
                <Button href={project.link} variant="secondary" size="md" className="mt-5 w-full">
                  Visitar sitio en vivo
                  <ExternalLink size={16} />
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
