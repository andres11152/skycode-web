import { PRICING } from "./projectEstimator";

// Tokens de precio y plazo del cotizador para el copy (JSON): una sola fuente de verdad (`PRICING` en
// projectEstimator.ts), así las páginas de servicios, la de Bogotá y el cotizador nunca muestran cifras
// distintas. Tokens: `{price.web}` ($4.500.000 COP), `{priceShort.web}` ($4,5 M COP), `{priceUsd.web}`
// ($1.150 USD) y `{weeks.web}` (3). El id es el del tipo de proyecto del cotizador.

function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")} COP`;
}

/** "$4,5 M COP" — para el meta description, donde cada carácter cuenta. */
function formatCopShort(amount: number): string {
  const millions = (amount / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return `$${millions} M COP`;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")} USD`;
}

const TOKEN = /\{(price|priceShort|priceUsd|weeks)\.([a-z]+)\}/g;

/** Reemplaza los tokens por las cifras del cotizador; un token con un id desconocido se deja tal cual. */
export function fillPricingTokens(text: string): string {
  return text.replace(TOKEN, (match, kind: string, id: string) => {
    const entry = PRICING[id];
    if (!entry) return match;
    if (kind === "price") return formatCop(entry.priceCop);
    if (kind === "priceShort") return formatCopShort(entry.priceCop);
    if (kind === "priceUsd") return formatUsd(entry.priceUsd);
    return String(entry.baseWeeks);
  });
}

export function formatPriceCop(amount: number): string {
  return formatCop(amount);
}

/** Aplica `fillPricingTokens` a todas las cadenas de un valor (objetos y arreglos anidados), sin mutarlo. */
export function fillPricingTokensDeep<T>(value: T): T {
  if (typeof value === "string") return fillPricingTokens(value) as T;
  if (Array.isArray(value)) return value.map((item) => fillPricingTokensDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fillPricingTokensDeep(child)])) as T;
  }
  return value;
}
