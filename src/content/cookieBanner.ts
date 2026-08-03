import cookieBannerDataEs from "./locales/es/cookie-banner.json";
import cookieBannerDataEn from "./locales/en/cookie-banner.json";
import cookieBannerDataFr from "./locales/fr/cookie-banner.json";
import type { Locale } from "@/lib/i18n";

const cookieBannerByLocale = {
  es: cookieBannerDataEs,
  en: cookieBannerDataEn,
  fr: cookieBannerDataFr,
};

export function getCookieBannerContent(locale: Locale) {
  return cookieBannerByLocale[locale];
}
