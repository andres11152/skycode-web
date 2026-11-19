import type { CSSProperties } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getTestimonialsContent } from "@/content/testimonials";
import { getUiContent } from "@/content/ui";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { SwipeRail } from "@/components/ui/SwipeRail";

/** Iniciales para el avatar tipográfico (sin foto: no hay retratos de los clientes). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "").slice(0, 2)).toUpperCase();
}

/**
 * Testimonios en banda oscura, como citas editoriales en rejilla (2 × 2) en vez
 * de un carrusel con autoplay, flechas y puntos. Server Component: antes se
 * cargaba solo en el navegador (`ssr: false`), así que el HTML inicial no tenía
 * ninguno de los testimonios y los buscadores no los veían. Sin testimonios
 * reales, la sección entera desaparece.
 *
 * Móvil: carrusel deslizable (`SwipeRail`, snap nativo, todas las citas en el HTML) en vez de 4
 * citas apiladas (~2 pantallas). Cada cita lleva un avatar con las iniciales de quien la firma.
 */
export function Testimonials({ locale = defaultLocale }: { locale?: Locale }) {
  const { testimonialsSection, testimonials } = getTestimonialsContent(locale);
  const uiData = getUiContent(locale);

  if (testimonials.length === 0) return null;

  return (
    <section
      id="testimonios"
      aria-label={uiData.testimonialsSectionAria}
      className="cv-auto [--cv-h:950px] lg:[--cv-h:1130px] scroll-mt-24 band px-6 py-24 text-on-inverse sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionEyebrow onDark className="reveal-up mb-4">
            {testimonialsSection.badge}
          </SectionEyebrow>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-on-inverse sm:text-5xl">
            <RevealText text={testimonialsSection.title} />
          </h2>
          <p style={{ "--i": 3 } as CSSProperties} className="reveal-up mt-5 text-lg leading-relaxed text-on-inverse/80">{testimonialsSection.description}</p>
        </div>

        <div className="mt-12 sm:mt-16">
          <SwipeRail
            label={uiData.testimonialsSectionAria}
            labels={uiData.rail}
            className="sm:grid sm:gap-x-12 sm:gap-y-14 md:grid-cols-2"
            itemClassName="max-sm:flex"
            items={testimonials.map((item, index) => (
              <div
                key={`${item.company}-${item.name}`}
                style={{ "--i": index % 2 } as CSSProperties}
                className="scroll-reveal relative h-full w-full border-t border-on-inverse/20 pt-8 max-sm:rounded-xl max-sm:border max-sm:border-on-inverse/10 max-sm:bg-surface-raised/80 max-sm:p-6 max-sm:shadow-lg max-sm:shadow-black/5 max-sm:backdrop-blur"
              >
                {/* Comilla tipográfica gigante, casi invisible, con parallax: da profundidad sin añadir un ícono. */}
                <span aria-hidden="true" className="parallax pointer-events-none absolute -top-12 right-0 font-bold text-[9rem] leading-none text-on-inverse/[0.06] select-none max-sm:top-0 max-sm:right-4">
                  “
                </span>
                <figure className="relative flex h-full flex-col justify-between gap-8">
                  <blockquote className="text-base leading-relaxed text-on-inverse/90 sm:text-xl sm:leading-relaxed">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs font-semibold text-background"
                    >
                      {initials(item.name)}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-on-inverse">{item.name}</span>
                      <span className="font-mono text-xs text-on-inverse/70">
                        {item.role} · {item.company}
                        {item.location ? ` · ${item.location}` : ""}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </div>
            ))}
          />
        </div>
      </div>
    </section>
  );
}
