import { createElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { getPortfolioIcon, type PortfolioProject } from "@/content/portfolioShared";
import { portfolioCasePath } from "@/lib/portfolioPaths";
import type { Locale } from "@/lib/i18n";

/**
 * Caso del portafolio como prueba de un servicio — compartido por el índice
 * (`/servicios`, con los servicios aplicados como chips) y el detalle
 * (`/servicios/[slug]`, sin chips: ahí el servicio ya es obvio). El enlace va
 * al caso en el idioma de la página (`portfolioCasePath`).
 *
 * Portada propia en vez de `ProjectCover`: ese es un componente cliente que
 * recibe el ícono (una función) por prop, y una función no puede cruzar de
 * un Server Component a uno cliente.
 */
export function ServiceCaseCard({
  project,
  locale,
  headingLevel = "h3",
  serviceTitles,
  servicesLabel,
}: {
  project: PortfolioProject;
  locale: Locale;
  headingLevel?: "h2" | "h3";
  serviceTitles?: string[];
  servicesLabel?: string;
}) {
  const Heading = headingLevel;

  return (
    <Link
      href={portfolioCasePath(locale, project.slug)}
      className="group scroll-reveal flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background outline-none transition-colors duration-200 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-foreground/10 bg-foreground">
        {project.coverImage ? (
          // alt vacío: el título del caso ya nombra el enlace, la portada es decorativa.
          <Image
            src={project.coverImage.variants.md}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-top transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <div aria-hidden="true" className="flex h-full items-center justify-center text-background/70">
            {/* createElement: el ícono sale de un mapa estático (PORTFOLIO_ICON_MAP), no se crea en el render. */}
            {createElement(getPortfolioIcon(project.industryIcon), { size: 40, weight: "duotone" })}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">{project.clientLabel}</span>
        <Heading className="flex items-start justify-between gap-3 text-lg font-bold tracking-tight text-balance text-foreground">
          {project.title}
          <ArrowUpRight
            size={18}
            aria-hidden="true"
            className="mt-1 shrink-0 text-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-strong motion-reduce:transform-none"
          />
        </Heading>
        <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">{project.summary}</p>
        {serviceTitles && serviceTitles.length > 0 && (
          <ul aria-label={servicesLabel} className="mt-auto flex flex-wrap gap-2 pt-3">
            {serviceTitles.map((title) => (
              <li key={title} className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-foreground/80">
                {title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
