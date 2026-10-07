// Cotizador en la home: vista previa interactiva (tipo de proyecto → precio base y semanas) y
// salida a /cotizador para el detalle. Server Component; solo `EstimatorPreview` es isla cliente.
// Los precios salen de `PRICING` (content/projectEstimator.ts), la misma fuente que el cotizador
// completo y la página de Bogotá: una sola cifra por tipo de proyecto en todo el sitio.

import { EstimatorPreview } from "@/components/sections/EstimatorPreview";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getDefaultCurrency, getProjectEstimatorContent } from "@/content/projectEstimator";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";

const NUMBER_LOCALE: Record<Locale, string> = { es: "es-CO", en: "en-US", fr: "fr-FR" };

export function ProjectEstimatorTeaser({ locale = defaultLocale }: { locale?: Locale }) {
  const content = getProjectEstimatorContent(locale);
  const currency = getDefaultCurrency(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  const types = content.projectTypes.map((type) => ({
    id: type.id,
    title: type.title,
    price: currency === "COP" ? type.priceCop : type.priceUsd,
    weeks: type.baseWeeks,
  }));

  return (
    <section
      id="cotizador"
      aria-label={content.sectionAria}
      className="cv-auto [--cv-h:1045px] lg:[--cv-h:740px] scroll-mt-24 border-y border-foreground/10 bg-foreground/[0.03] px-6 py-24 sm:py-32"
    >
      {/* `grid-cols-[minmax(0,1fr)]` en móvil: sin columna explícita, el contenido ancho (cifra de precio) estira la pista y desborda la página. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-20">
        <div className="reveal-left max-w-xl">
          <SectionEyebrow className="mb-4">{content.badge}</SectionEyebrow>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
            {content.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-foreground/80">{content.subtitle}</p>
          <div className="mt-8">
            <Button href={`${prefix}/cotizador`} variant="accent" size="lg">
              {content.teaserCta}
            </Button>
          </div>
        </div>

        <div className="reveal-right">
        <EstimatorPreview
          types={types}
          currency={currency}
          numberLocale={NUMBER_LOCALE[locale]}
          copy={{
            groupLabel: content.steps.type,
            fromLabel: content.fromLabel,
            weeksSuffix: content.summary.weeksSuffix.toLowerCase(),
          }}
        />
        </div>
      </div>
    </section>
  );
}
