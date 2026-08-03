import blogTeaserDataEs from "./locales/es/blog-teaser.json";
import blogTeaserDataEn from "./locales/en/blog-teaser.json";
import blogTeaserDataFr from "./locales/fr/blog-teaser.json";
import type { Locale } from "@/lib/i18n";

const blogTeaserByLocale = { es: blogTeaserDataEs, en: blogTeaserDataEn, fr: blogTeaserDataFr };

export function getBlogTeaserContent(locale: Locale) {
  return blogTeaserByLocale[locale];
}
