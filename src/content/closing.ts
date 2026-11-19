import closingDataEs from "./locales/es/closing.json";
import closingDataEn from "./locales/en/closing.json";
import closingDataFr from "./locales/fr/closing.json";
import type { Locale } from "@/lib/i18n";

const closingByLocale = { es: closingDataEs, en: closingDataEn, fr: closingDataFr };

/**
 * `statementBody` es el statement sin su punto final: el cierre lo pinta con `BrandPeriod`
 * (el punto amarillo del logo). Si el copy no termina en punto, `endsWithPeriod` es `false`
 * y no se añade ninguno.
 */
export function getClosingContent(locale: Locale) {
  const data = closingByLocale[locale];
  const endsWithPeriod = data.statement.endsWith(".");
  return {
    ...data,
    endsWithPeriod,
    statementBody: endsWithPeriod ? data.statement.slice(0, -1) : data.statement,
  };
}
