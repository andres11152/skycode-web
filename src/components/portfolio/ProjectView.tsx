"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowSquareOut, CaretDown, CheckCircle, CornersOut } from "@phosphor-icons/react";
import { m as motion, useReducedMotion } from "framer-motion";
import { InlineText } from "@/components/blog/InlineText";
import { Button } from "@/components/ui/Button";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CaptureSlide } from "@/components/portfolio/CaptureSlide";
import { CaseVisual } from "@/components/portfolio/CaseVisual";
import { GalleryRail } from "@/components/portfolio/GalleryRail";
import { NextCase, type NextCaseData } from "@/components/portfolio/NextCase";
import { TechIcon } from "@/components/portfolio/TechIcon";
import { ChapterTabs } from "@/components/portfolio/ChapterTabs";
import { CountUp } from "@/components/ui/CountUp";
import { fadeUp } from "@/lib/animations";
import { preloadNextImage } from "@/lib/preloadImage";
import { cn } from "@/lib/utils";
import {
  getPortfolioIcon,
  getProjectHostname,
  visibleCaseBlocks,
  type CaseRelatedLinks,
  type PortfolioProject,
} from "@/content/portfolioShared";
import type { PortfolioSectionCopy } from "@/content/projects";
import { portfolioIndexPath } from "@/lib/portfolioPaths";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { localeHomePath, t, type Locale } from "@/lib/i18n";
import { textOrNull, withoutTodos } from "@/lib/todoPlaceholders";

// El visor (gestos, zoom, portal) se descarga solo al acercarse a una captura o abrirla: la página
// no paga ese JS si nadie lo usa. `loadLightbox` se reutiliza para precargar por intención.
const loadLightbox = () => import("@/components/ui/Lightbox").then((module) => module.Lightbox);
const Lightbox = dynamic(loadLightbox, { ssr: false });

const WRAP = "mx-auto w-full max-w-6xl px-6";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const VIEWPORT = { once: true, margin: "-80px" } as const;

/** Un capítulo con más de estas palabras se pliega en móvil detrás de "Leer más". */
const COLLAPSE_WORDS = 70;

/**
 * Valor de métrica animable: solo un entero "limpio" de 2+ cifras con un prefijo/sufijo simple
 * ("175", "+40%", "90 días"). Rangos ("2–5"), decimales y miles ("10.000") se muestran tal cual:
 * los valores son texto libre del dashboard y adivinar su formato sería frágil.
 */
function parseCountable(value: string): { prefix: string; number: number; suffix: string } | null {
  const match = /^([+~<>]?)(\d{2,})(\s?[^\d.,–-]*)$/.exec(value.trim());
  if (!match) return null;
  return { prefix: match[1], number: Number(match[2]), suffix: match[3] };
}

export function ProjectView({
  locale,
  project,
  nextProject,
  sectionCopy,
  related,
}: {
  locale: Locale;
  project: PortfolioProject;
  nextProject: NextCaseData | null;
  sectionCopy: PortfolioSectionCopy;
  /** Servicios y artículos enlazados, resueltos en el servidor (ver PortfolioCasePage). */
  related: CaseRelatedLinks;
}) {
  const copy = sectionCopy.detail;
  const homeHref = localeHomePath(locale);
  const contactHref = `${homeHref === "/" ? "" : homeHref}/#contacto`;
  const indexHref = portfolioIndexPath(locale);
  const reduced = Boolean(useReducedMotion());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  // Se monta al primer uso y se queda montado: así la salida animada del visor sí se ve.
  const [lightboxMounted, setLightboxMounted] = useState(false);
  // Capítulos desplegados en móvil (en `sm`+ siempre se ven completos).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const galleryImages = project.images;
  const hostname = getProjectHostname(project);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxMounted(true);
    setLightboxOpen(true);
  };

  const prefetchLightbox = () => {
    void loadLightbox();
  };

  // Calienta la imagen contigua (la URL optimizada exacta que pedirá el visor).
  const preloadSlide = useCallback(
    (slideIndex: number) => {
      const image = galleryImages[slideIndex];
      if (image) preloadNextImage(image.variants.lg, "92vw");
    },
    [galleryImages],
  );

  // El lienzo del Lightbox ya define un tamaño grande y consistente (ver Lightbox.tsx): cada slide
  // solo lo llena con `object-contain`, sin forzar una relación de aspecto que haría letterboxing
  // exagerado al hacer zoom. Cada slide es en capas (ver CaptureSlide) para no mostrar nunca un hueco.
  const captionFor = (image: (typeof galleryImages)[number], index: number) =>
    image.alt || t(copy.captureAlt, { title: project.title, index: String(index + 1) });
  const slides =
    galleryImages.length > 0
      ? galleryImages.map((image, index) => <CaptureSlide key={image.id} image={image} alt={captionFor(image, index)} />)
      : [
          <ProjectCover
            key="cover"
            icon={getPortfolioIcon(project.industryIcon)}
            imageSrc={project.coverImage?.variants.lg}
            className="h-full w-full"
            iconClassName="h-24 w-24"
          />,
        ];

  // Capítulos del caso completo: cada uno se OCULTA si no tiene contenido
  // visible (vacío, o solo con marcadores `{{TODO}}` en producción). El
  // stack con íconos se muestra dentro de "Arquitectura y stack" cuando ese
  // capítulo existe; si no, en su franja propia de más abajo.
  const chapters = [
    { key: "context", label: copy.context, text: project.clientContext },
    { key: "challenge", label: copy.challenge, text: project.challenge },
    { key: "solution", label: copy.solution, text: project.solution },
    { key: "architecture", label: copy.architecture, text: project.architecture },
    { key: "process", label: copy.process, text: project.process },
    { key: "results", label: copy.results, text: project.results },
  ]
    .map((chapter) => ({ ...chapter, blocks: visibleCaseBlocks(chapter.text) }))
    .filter((chapter) => chapter.blocks.length > 0);

  const stackInArchitecture = chapters.some((chapter) => chapter.key === "architecture") && project.technologies.length > 0;

  const stackChips = (
    <ul className="flex flex-wrap gap-3">
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
  );

  // Una métrica con marcador `{{TODO}}` (valor o etiqueta) no se publica.
  const metrics = withoutTodos(project.metrics);

  // Testimonio: solo con cita real; autor y cargo se omiten cada uno por su lado.
  const testimonialQuote = textOrNull(project.testimonialQuote);
  const testimonialAuthor = textOrNull(project.testimonialAuthor);
  const testimonialRole = textOrNull(project.testimonialRole);

  const bogotaLinkLang = locale === "es" ? undefined : "es";

  return (
    <main id="main-content" className="pt-28 sm:pt-36">
      <ScrollProgress />

      {/* Cabecera: sin animación de entrada — el h1 y el resumen pueden ser el LCP. */}
      <header className={WRAP}>
        <nav aria-label={sectionCopy.breadcrumb.aria}>
          <ol className="breadcrumbs flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link href={homeHref} className={cn("rounded hover:text-foreground", FOCUS)}>
                {sectionCopy.breadcrumb.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={indexHref} className={cn("rounded hover:text-foreground", FOCUS)}>
                {sectionCopy.breadcrumb.portfolio}
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
            blurDataURL={project.coverImage?.blurDataURL}
            color={project.coverImage?.color}
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
            onPointerEnter={prefetchLightbox}
            onFocus={prefetchLightbox}
            aria-label={copy.expandImage}
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-inverse/60 text-on-inverse outline-none backdrop-blur-sm transition-colors hover:bg-inverse/75 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
          >
            <CornersOut size={18} />
          </button>
        </div>

      </div>

      {/* Cifras justo después de la portada (antes, al final del caso: la auditoría móvil las encontró
          en la pantalla 9). Los enteros "limpios" cuentan desde 0 al entrar en pantalla (`CountUp`). */}
      {metrics.length > 0 && (
        <section aria-label={copy.metrics} className={cn(WRAP, "mt-10 sm:mt-14")}>
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent-text">{copy.metrics}</h2>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {metrics.map((metric, index) => {
              const countable = parseCountable(metric.value);
              return (
                <div
                  key={`${metric.label}-${index}`}
                  className="flex flex-col-reverse justify-end border-l border-foreground/15 pl-4 sm:pl-5"
                >
                  <dt className="mt-2 text-sm leading-snug text-foreground/80">{metric.label}</dt>
                  <dd className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    {countable ? (
                      <CountUp value={countable.number} prefix={countable.prefix} suffix={countable.suffix} />
                    ) : (
                      metric.value
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {/* Datos clave: fila editorial con divisores, no una sidebar. Va después de las cifras: primero lo visual. */}
      <div className={WRAP}>
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

      {galleryImages.length > 0 && (
        <motion.section
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className={cn(WRAP, "mt-12 sm:mt-16")}
        >
          <GalleryRail
            images={galleryImages}
            title={copy.gallery}
            regionLabel={copy.galleryRegion}
            prevLabel={copy.galleryPrev}
            nextLabel={copy.galleryNext}
            expandLabel={copy.expandImage}
            onOpen={openLightbox}
            onIntent={prefetchLightbox}
          />
        </motion.section>
      )}

      {project.technologies.length > 0 && !stackInArchitecture && (
        <motion.section
          aria-label={copy.stack}
          variants={fadeUp(reduced)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className={cn(WRAP, "mt-10")}
        >
          <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.stack}</h2>
          <div className="mt-4">{stackChips}</div>
        </motion.section>
      )}

      {/* Capítulos: etiqueta fija a la izquierda, texto grande a la derecha. Solo si hay contenido real. */}
      {chapters.length > 0 && (
        <div className={cn(WRAP, "mt-16 sm:mt-24")}>
          <ChapterTabs label={copy.chaptersNav} chapters={chapters.map(({ key, label }) => ({ key, label }))} />
          {chapters.map((chapter, index) => {
            const words = chapter.blocks
              .map((block) => (block.type === "list" ? block.items.join(" ") : block.text))
              .join(" ")
              .split(/\s+/).length;
            const collapsible = words > COLLAPSE_WORDS;
            const isOpen = !collapsible || expanded[chapter.key];
            return (
            <motion.section
              key={chapter.key}
              id={`capitulo-${chapter.key}`}
              aria-labelledby={`chapter-${chapter.key}`}
              variants={fadeUp(reduced)}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
              className="grid scroll-mt-20 gap-4 border-t border-foreground/10 py-10 first-of-type:border-t-0 sm:scroll-mt-40 sm:py-14 lg:scroll-mt-28 lg:grid-cols-[14rem_1fr] lg:gap-16 lg:first-of-type:border-t"
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
              <div>
              {/* Plegado solo en móvil: el texto entero sigue en el HTML (buscadores, Ctrl+F); se recorta con
                  una máscara y se abre con "Leer más". La altura no se anima (regla del proyecto). */}
              <div
                id={`capitulo-${chapter.key}-texto`}
                className={cn(
                  "max-w-2xl space-y-5",
                  !isOpen && "max-sm:max-h-48 max-sm:overflow-hidden max-sm:[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
                )}
              >
                {chapter.blocks.map((block, blockIndex) =>
                  block.type === "list" ? (
                    <ul
                      key={blockIndex}
                      className="list-disc space-y-2 pl-5 text-base leading-relaxed text-foreground/80 marker:text-foreground/40 sm:text-lg"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <InlineText text={item} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={blockIndex} className="text-base leading-relaxed text-foreground/80 sm:text-lg">
                      <InlineText text={block.text} />
                    </p>
                  ),
                )}
                {chapter.key === "architecture" && stackInArchitecture && (
                  <div className="pt-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.stack}</h3>
                    <div className="mt-3">{stackChips}</div>
                  </div>
                )}
              </div>
              {collapsible && (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`capitulo-${chapter.key}-texto`}
                  onClick={() => setExpanded((current) => ({ ...current, [chapter.key]: !isOpen }))}
                  className={cn(
                    "mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-foreground sm:hidden",
                    FOCUS,
                  )}
                >
                  {isOpen ? copy.readLess : copy.readMore}
                  <CaretDown
                    size={14}
                    aria-hidden="true"
                    className={cn("transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}
                  />
                </button>
              )}
              </div>
            </motion.section>
            );
          })}
        </div>
      )}


      {testimonialQuote && (
        <section aria-label={copy.testimonial} className={cn(WRAP, "mt-16 sm:mt-24")}>
          <figure className="grid gap-4 border-t border-foreground/10 pt-10 lg:grid-cols-[14rem_1fr] lg:gap-16 lg:pt-14">
            <figcaption className="order-2 text-sm leading-relaxed text-foreground/70 lg:order-1">
              <span className="block text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.testimonial}</span>
              {testimonialAuthor && <span className="mt-3 block text-base font-semibold text-foreground">{testimonialAuthor}</span>}
              {testimonialRole && <span className="block">{testimonialRole}</span>}
            </figcaption>
            <blockquote className="order-1 max-w-2xl text-2xl font-medium leading-snug tracking-tight text-balance text-foreground sm:text-3xl lg:order-2">
              &ldquo;{testimonialQuote}&rdquo;
            </blockquote>
          </figure>
        </section>
      )}


      <section aria-label={copy.related.title} className={cn(WRAP, "mt-16 sm:mt-24")}>
        <div className="grid gap-10 border-t border-foreground/10 pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {related.services.length > 0 && (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                {related.services.length === 1 ? copy.related.service : copy.related.services}
              </h2>
              <ul className="mt-4 space-y-2">
                {related.services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      href={service.href}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded text-base font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground",
                        FOCUS,
                      )}
                    >
                      {service.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {related.posts.length > 0 && (
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.related.posts}</h2>
              <ul className="mt-4 space-y-2">
                {related.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={post.href}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded text-base font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground",
                        FOCUS,
                      )}
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">{copy.related.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/80">
              {copy.related.bogotaLead}{" "}
              <Link
                href={bogotaPagePath}
                hrefLang={bogotaLinkLang}
                className={cn(
                  "rounded font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground",
                  FOCUS,
                )}
              >
                {copy.related.bogotaLabel}
              </Link>
            </p>
          </div>
        </div>
      </section>

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
        {nextProject && <NextCase next={nextProject} label={copy.nextCase} locale={locale} />}
      </div>

      <section aria-label={copy.ctaTitle} className={cn(WRAP, "pb-24 sm:pb-32", !nextProject && "mt-8")}>
        <div className="flex flex-col gap-6 border-t border-foreground/10 pt-12 sm:flex-row sm:items-center sm:justify-between sm:pt-16">
          <p className="max-w-xl text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
            {copy.ctaTitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button href={indexHref} variant="secondary" size="lg">
              {copy.viewAllCases}
            </Button>
            <Button href={contactHref} variant="accent" size="lg">
              {copy.ctaButton}
            </Button>
          </div>
        </div>
      </section>

      {lightboxMounted && (
        <Lightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          slides={slides}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          labels={copy.lightbox}
          captions={galleryImages.map(captionFor)}
          onPreload={preloadSlide}
        />
      )}
    </main>
  );
}
