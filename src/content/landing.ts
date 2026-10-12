import type { Metadata } from "next";
import landingEs from "./locales/es/landing.json";
import { PRICING } from "./projectEstimator";
import { fillPricingTokens } from "./pricingTokens";

// Landing de campaña de Google Ads (tráfico de búsqueda en Colombia): solo español. El copy vive en
// `locales/es/landing.json` para que `aiTells.test.ts` lo revise; las cifras de precio y plazo NO van
// en el JSON, salen de `PRICING` (misma fuente que el cotizador y las páginas de servicios).

export const LANDING_VARIANT_IDS = ["general", "precio", "integraciones"] as const;
export type LandingVariantId = (typeof LANDING_VARIANT_IDS)[number];

export function isLandingVariantId(value: string): value is LandingVariantId {
  return (LANDING_VARIANT_IDS as readonly string[]).includes(value);
}

/** Ruta pública de cada variante: la general vive en `/landing`, las demás en `/landing/{id}`. */
export function landingPath(variant: LandingVariantId): string {
  return variant === "general" ? "/landing" : `/landing/${variant}`;
}

export function getLandingContent(variant: LandingVariantId) {
  const copy = landingEs;
  const entries = Object.entries(PRICING);
  const cheapest = entries.reduce((min, entry) => (entry[1].priceCop < min[1].priceCop ? entry : min));
  const quickest = Math.min(...entries.map(([, value]) => value.baseWeeks));

  return {
    ...copy,
    variant: { id: variant, ...copy.variants[variant] },
    facts: {
      ariaLabel: copy.facts.ariaLabel,
      items: [
        { label: copy.facts.from, value: fillPricingTokens(`{priceShort.${cheapest[0]}}`) },
        { label: copy.facts.term, value: copy.facts.termValue.replace("{weeks}", String(quickest)) },
        { label: copy.facts.warranty, value: copy.facts.warrantyValue },
      ],
    },
    pricingRows: copy.pricing.rows.map((row) => ({
      id: row.id,
      label: row.label,
      price: fillPricingTokens(`{priceShort.${row.id}}`),
      weeks: PRICING[row.id]?.baseWeeks ?? 0,
    })),
  };
}

export type LandingContent = ReturnType<typeof getLandingContent>;

export function getLandingMetadata(variant: LandingVariantId): Metadata {
  const { metaTitle, metaDescription } = landingEs.variants[variant];
  return {
    title: metaTitle,
    description: metaDescription,
    // Página de campaña: no compite en buscadores con la home ni con /servicios.
    robots: { index: false, follow: false },
    alternates: { canonical: landingPath(variant) },
  };
}
