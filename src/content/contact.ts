import contactDataEs from "./locales/es/contact.json";
import contactDataEn from "./locales/en/contact.json";
import contactDataFr from "./locales/fr/contact.json";
import type { Locale } from "@/lib/i18n";

const contactByLocale = { es: contactDataEs, en: contactDataEn, fr: contactDataFr };

export function getContactContent(locale: Locale) {
  return contactByLocale[locale];
}
