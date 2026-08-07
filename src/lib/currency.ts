// Funciones puras, sin dependencias de Node/Postgres a propósito — este
// módulo lo importan tanto Server Components como Client Components (ej.
// CurrencySelect.tsx). La resolución de la tasa de cambio en sí
// (getUsdToCopRate, que sí necesita `pg`) vive en lib/exchangeRate.ts;
// mezclarla acá arrastraría `pg` al bundle del navegador (ya pasó una
// vez: "Module not found: Can't resolve 'tls'").

export type Currency = "COP" | "USD";
export const CURRENCIES: Currency[] = ["COP", "USD"];

export function isValidCurrency(value: string): value is Currency {
  return CURRENCIES.includes(value as Currency);
}

/** Convierte entre COP y USD usando la tasa USD→COP ya resuelta. */
export function convertCurrency(amount: number, from: Currency, to: Currency, usdToCopRate: number): number {
  if (from === to) return amount;
  if (from === "USD" && to === "COP") return amount * usdToCopRate;
  if (from === "COP" && to === "USD") return amount / usdToCopRate;
  return amount;
}
