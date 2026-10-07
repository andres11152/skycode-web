import type { CSSProperties } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { getFaqContent } from "@/content/faq";
import { faqPath } from "@/lib/faqPaths";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

export function Faq({ locale = defaultLocale }: { locale?: Locale }) {
  const faqData = getFaqContent(locale);
  const faqHref = faqPath(locale);

  return (
    <section id="faq" className="cv-auto [--cv-h:1030px] lg:[--cv-h:970px] scroll-mt-24 px-6 py-24 sm:py-32">
      {/* max-w-6xl: mismo ancho de contenedor que el resto de secciones. El
          acordeón en sí se queda en `max-w-3xl` (las preguntas no deben
          estirarse a todo el ancho) pero centrado dentro de ese contenedor
          — a pedido explícito. El acordeón es el mismo componente (y el mismo
          catálogo, por `id`) que usa la página /preguntas-frecuentes. */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow className="reveal-up mb-3">{faqData.badge}</SectionEyebrow>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl"><RevealText text={faqData.title} /></h2>
            <p className="mt-3 text-foreground/80">{faqData.description}</p>
          </div>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col border-t border-foreground/10">
          {faqData.items.map((item, index) => (
            <div key={item.id} style={{ "--i": index % 4 } as CSSProperties} className="scroll-reveal">
              <FaqAccordionItem item={item} />
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl justify-center">
          <Button href={faqHref} variant="secondary" size="md">
            {t(faqData.moreQuestions, { count: String(faqData.totalCount) })}
          </Button>
        </div>
      </div>
    </section>
  );
}
