import uiDataEs from "./locales/es/ui.json";
import uiDataEn from "./locales/en/ui.json";
import uiDataFr from "./locales/fr/ui.json";
import type { Locale } from "@/lib/i18n";

const uiByLocale = { es: uiDataEs, en: uiDataEn, fr: uiDataFr };

export function getUiContent(locale: Locale) {
  return uiByLocale[locale];
}
