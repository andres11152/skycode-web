import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Service } from "@/content/services";
import { cn } from "@/lib/utils";

const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";
const LINK_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * "Servicios relacionados" al pie de un artículo: 2–3 tarjetas-enlace hacia
 * las páginas de servicio que respaldan el tema del post (la relación sale de
 * `content/relatedContent.ts`, la misma tabla de la que se deriva el bloque
 * inverso "Artículos relacionados" de cada servicio). Server Component, sin
 * animación: queda bajo el pliegue y el cuerpo del artículo puede ser el LCP.
 * Sin servicios no renderiza nada — un post sin relación real no muestra
 * el bloque en vez de forzar un enlace.
 *
 * Los enlaces son tarjetas completas pero el nombre accesible es el título
 * del servicio (el resto de la tarjeta es `aria-hidden` o texto descriptivo
 * dentro del mismo enlace), y ninguna lleva el acento: el único CTA de
 * acento del artículo es la banda oscura final.
 */
export function RelatedServices({
  services,
  heading,
  ctaLabel,
  hrefFor,
}: {
  services: Service[];
  heading: string;
  ctaLabel: string;
  /** Ruta con prefijo de idioma de la página del servicio. */
  hrefFor: (slug: string) => string;
}) {
  if (services.length === 0) return null;

  return (
    <section aria-labelledby="article-related-services" className="flex flex-col gap-5 border-t border-foreground/10 pt-10">
      <h2 id="article-related-services" className={LABEL}>
        {heading}
      </h2>
      <ul className="flex flex-col gap-4">
        {services.map((service) => (
          <li key={service.slug}>
            <Link
              href={hrefFor(service.slug)}
              className={cn(
                "group flex items-start gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-5 transition-colors duration-200 hover:border-foreground/25 sm:p-6",
                LINK_FOCUS,
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-background text-foreground/70 transition-colors duration-200 group-hover:border-accent/30 group-hover:text-accent-strong"
              >
                <service.coverIcon size={22} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold tracking-tight text-balance text-foreground">{service.title}</span>
                <span className="mt-1.5 block text-base leading-relaxed text-foreground/80 line-clamp-2">{service.description}</span>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-accent-strong">
                  {ctaLabel}
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
