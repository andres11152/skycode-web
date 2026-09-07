import errorsDataEs from "./locales/es/errors.json";
import errorsDataEn from "./locales/en/errors.json";
import errorsDataFr from "./locales/fr/errors.json";
import type { Locale } from "@/lib/i18n";

const errorsByLocale = { es: errorsDataEs, en: errorsDataEn, fr: errorsDataFr };

export function getErrorsContent(locale: Locale) {
  return errorsByLocale[locale];
}
