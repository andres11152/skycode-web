import highlightsDataEs from "./locales/es/highlights.json";
import highlightsDataEn from "./locales/en/highlights.json";
import highlightsDataFr from "./locales/fr/highlights.json";
import type { Locale } from "@/lib/i18n";

const highlightsByLocale = { es: highlightsDataEs, en: highlightsDataEn, fr: highlightsDataFr };

export function getHighlightsContent(locale: Locale) {
  return highlightsByLocale[locale];
}
