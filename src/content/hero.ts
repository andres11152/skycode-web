import heroDataEs from "./locales/es/hero.json";
import heroDataEn from "./locales/en/hero.json";
import heroDataFr from "./locales/fr/hero.json";
import type { Locale } from "@/lib/i18n";

const heroByLocale = { es: heroDataEs, en: heroDataEn, fr: heroDataFr };

export function getHeroContent(locale: Locale) {
  return heroByLocale[locale];
}
