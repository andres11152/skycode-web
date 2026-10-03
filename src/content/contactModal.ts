import es from "./locales/es/contact-modal.json";
import en from "./locales/en/contact-modal.json";
import fr from "./locales/fr/contact-modal.json";
import type { Locale } from "@/lib/i18n";

const byLocale = { es, en, fr };

export function getContactModalContent(locale: Locale) {
  return byLocale[locale];
}
