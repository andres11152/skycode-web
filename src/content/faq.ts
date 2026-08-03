import faqDataEs from "./locales/es/faq.json";
import faqDataEn from "./locales/en/faq.json";
import faqDataFr from "./locales/fr/faq.json";
import type { Locale } from "@/lib/i18n";

const faqByLocale = { es: faqDataEs, en: faqDataEn, fr: faqDataFr };

export function getFaqContent(locale: Locale) {
  return faqByLocale[locale];
}
