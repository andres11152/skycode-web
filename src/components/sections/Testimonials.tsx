import type { CSSProperties } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getTestimonialsContent } from "@/content/testimonials";
import { getUiContent } from "@/content/ui";
import { defaultLocale, type Locale } from "@/lib/i18n";

/**
 * Testimonios en banda oscura, como citas editoriales en rejilla (2 × 2) en vez
 * de un carrusel con autoplay, flechas y puntos. Server Component: antes se
 * cargaba solo en el navegador (`ssr: false`), así que el HTML inicial no tenía
 * ninguno de los testimonios y los buscadores no los veían. Sin testimonios
 * reales, la sección entera desaparece.
 */
export function Testimonials({ locale = defaultLocale }: { locale?: Locale }) {
  const { testimonialsSection, testimonials } = getTestimonialsContent(locale);
  const uiData = getUiContent(locale);

  if (testimonials.length === 0) return null;

  return (
    <section
      id="testimonios"
      aria-label={uiData.testimonialsSectionAria}
      className="cv-auto [--cv-h:1800px] lg:[--cv-h:1130px] scroll-mt-24 bg-foreground px-6 py-24 text-background sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <SectionEyebrow onDark className="reveal-up mb-4">
            {testimonialsSection.badge}
          </SectionEyebrow>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-background sm:text-5xl">
            <RevealText text={testimonialsSection.title} />
          </h2>
          <p style={{ "--i": 3 } as CSSProperties} className="reveal-up mt-5 text-lg leading-relaxed text-background/80">{testimonialsSection.description}</p>
        </div>

        <ul className="mt-16 grid gap-x-12 gap-y-14 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <li key={`${item.company}-${item.name}`} style={{ "--i": index % 2 } as CSSProperties} className="scroll-reveal relative border-t border-background/20 pt-8">
              {/* Comilla tipográfica gigante, casi invisible, con parallax: da profundidad sin añadir un ícono. */}
              <span aria-hidden="true" className="parallax pointer-events-none absolute -top-12 right-0 font-bold text-[9rem] leading-none text-background/[0.06] select-none">
                “
              </span>
              <figure className="relative flex h-full flex-col justify-between gap-8">
                <blockquote className="text-lg leading-relaxed text-background/90 sm:text-xl sm:leading-relaxed">
                  “{item.quote}”
                </blockquote>
                <figcaption className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-background">{item.name}</span>
                  <span className="font-mono text-xs text-background/70">
                    {item.role} · {item.company}
                    {item.location ? ` · ${item.location}` : ""}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
