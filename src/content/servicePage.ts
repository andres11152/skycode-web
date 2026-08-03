import servicePageDataEs from "./locales/es/service-page.json";
import servicePageDataEn from "./locales/en/service-page.json";
import servicePageDataFr from "./locales/fr/service-page.json";
import type { Locale } from "@/lib/i18n";

const servicePageByLocale = { es: servicePageDataEs, en: servicePageDataEn, fr: servicePageDataFr };

export function getServicePageContent(locale: Locale) {
  return servicePageByLocale[locale];
}
