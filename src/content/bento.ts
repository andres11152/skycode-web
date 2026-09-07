import bentoDataEs from "./locales/es/bento.json";
import bentoDataEn from "./locales/en/bento.json";
import bentoDataFr from "./locales/fr/bento.json";
import type { Locale } from "@/lib/i18n";

const bentoByLocale = { es: bentoDataEs, en: bentoDataEn, fr: bentoDataFr };

export function getBentoContent(locale: Locale) {
  return bentoByLocale[locale];
}
