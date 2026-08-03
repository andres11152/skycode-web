import trustDataEs from "./locales/es/trust.json";
import trustDataEn from "./locales/en/trust.json";
import trustDataFr from "./locales/fr/trust.json";
import type { Locale } from "@/lib/i18n";

const trustByLocale = { es: trustDataEs, en: trustDataEn, fr: trustDataFr };

export function getTrustContent(locale: Locale) {
  return trustByLocale[locale];
}
