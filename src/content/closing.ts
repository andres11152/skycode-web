import closingDataEs from "./locales/es/closing.json";
import closingDataEn from "./locales/en/closing.json";
import closingDataFr from "./locales/fr/closing.json";
import type { Locale } from "@/lib/i18n";

const closingByLocale = { es: closingDataEs, en: closingDataEn, fr: closingDataFr };

export function getClosingContent(locale: Locale) {
  return closingByLocale[locale];
}
