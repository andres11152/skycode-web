import footerDataEs from "./locales/es/footer.json";
import footerDataEn from "./locales/en/footer.json";
import footerDataFr from "./locales/fr/footer.json";
import type { Locale } from "@/lib/i18n";

const footerByLocale = { es: footerDataEs, en: footerDataEn, fr: footerDataFr };

export function getFooterContent(locale: Locale) {
  return footerByLocale[locale];
}
