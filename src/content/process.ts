import processDataEs from "./locales/es/process.json";
import processDataEn from "./locales/en/process.json";
import processDataFr from "./locales/fr/process.json";
import type { Locale } from "@/lib/i18n";

const processByLocale = { es: processDataEs, en: processDataEn, fr: processDataFr };

export function getProcessContent(locale: Locale) {
  return processByLocale[locale];
}
