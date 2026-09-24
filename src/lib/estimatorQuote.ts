import { getProjectEstimatorContent } from "@/content/projectEstimator";
import type { Locale } from "./i18n";

/**
 * Recalcula la cotización del cotizador (ver ProjectEstimator.tsx) del
 * lado del servidor, a partir del mismo catálogo (`getProjectEstimatorContent`)
 * y las mismas fórmulas que usa el componente cliente — nunca desde texto
 * libre que mande el navegador. Es el mismo criterio que el hash de
 * integridad de Bold (lib/bold.ts): cualquier dato que determine lo que se
 * le muestra/envía a alguien se recalcula server-side desde una fuente
 * conocida, no se confía en lo que el cliente afirma que calculó.
 *
 * Sin esto, `POST /api/estimator/quote-email` habría tenido que aceptar
 * strings arbitrarios (`typeTitle`, `totalFormatted`, etc.) para poder
 * armar el correo — y como ese endpoint manda un correo a CUALQUIER
 * dirección que el visitante escriba, eso lo habría convertido en una
 * herramienta de "mandar el texto que yo quiera desde el dominio de
 * SkyCode a quien yo quiera" (phishing/spam), incluso escapando el HTML
 * correctamente. Aceptando solo IDs del catálogo, el correo solo puede
 * contener textos que el propio catálogo ya expone públicamente.
 */

export interface EstimatorQuoteInput {
  typeId: string;
  addonIds: string[];
  pace: "standard" | "express";
  currency: "COP" | "USD";
  locale: Locale;
}

export interface EstimatorQuoteResult {
  typeTitle: string;
  addonTitles: string[];
  paceLabel: string;
  totalPrice: number;
  totalWeeks: number;
  currency: "COP" | "USD";
  formattedTotal: string;
}

function formatPrice(amount: number, currency: "COP" | "USD"): string {
  return currency === "COP" ? `$${amount.toLocaleString("es-CO")} COP` : `$${amount.toLocaleString("en-US")} USD`;
}

/** `null` cuando `typeId` no existe en el catálogo del locale dado — un
 * `typeId` inventado o de otro locale no calza contra ninguno. */
export function computeEstimatorQuote(input: EstimatorQuoteInput): EstimatorQuoteResult | null {
  const content = getProjectEstimatorContent(input.locale);
  const currentType = content.projectTypes.find((type) => type.id === input.typeId);
  if (!currentType) return null;

  const selectedAddons = content.addons.filter((addon) => input.addonIds.includes(addon.id));

  const basePrice = input.currency === "COP" ? currentType.priceCop : currentType.priceUsd;
  const addonsTotal = selectedAddons.reduce(
    (acc, addon) => acc + (input.currency === "COP" ? addon.priceCop : addon.priceUsd),
    0
  );
  const addonsWeeks = selectedAddons.reduce((acc, addon) => acc + addon.weeks, 0);

  const rawPrice = basePrice + addonsTotal;
  const totalPrice = input.pace === "express" ? Math.round(rawPrice * 1.25) : rawPrice;

  const rawWeeks = Math.ceil(currentType.baseWeeks + addonsWeeks);
  const totalWeeks = input.pace === "express" ? Math.max(2, Math.round(rawWeeks * 0.75)) : rawWeeks;

  return {
    typeTitle: currentType.title,
    addonTitles: selectedAddons.map((addon) => addon.title),
    paceLabel: input.pace === "express" ? content.pace.expressTitle : content.pace.standardTitle,
    totalPrice,
    totalWeeks,
    currency: input.currency,
    formattedTotal: formatPrice(totalPrice, input.currency),
  };
}
