import navDataEs from "./locales/es/nav.json";
import navDataEn from "./locales/en/nav.json";
import navDataFr from "./locales/fr/nav.json";
import type { Locale } from "@/lib/i18n";

const navByLocale = { es: navDataEs, en: navDataEn, fr: navDataFr };

export function getNavContent(locale: Locale) {
  return navByLocale[locale];
}
