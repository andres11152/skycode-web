import testimonialsDataEs from "./locales/es/testimonials.json";
import testimonialsDataEn from "./locales/en/testimonials.json";
import testimonialsDataFr from "./locales/fr/testimonials.json";
import type { Locale } from "@/lib/i18n";

const testimonialsByLocale = {
  es: testimonialsDataEs,
  en: testimonialsDataEn,
  fr: testimonialsDataFr,
};

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  location: string | null;
  quote: string;
  /** El testimonio destacado en Highlights — evita repetir el mismo cliente
   * que ya se muestra completo en la grilla de Testimonios. */
  featured?: boolean;
}

export function getTestimonialsContent(locale: Locale) {
  const testimonialsData = testimonialsByLocale[locale];
  return {
    testimonialsSection: { badge: testimonialsData.badge, title: testimonialsData.title, description: testimonialsData.description },
    testimonials: testimonialsData.items as Testimonial[],
  };
}

export const testimonialsSection = getTestimonialsContent("es").testimonialsSection;
export const testimonials = getTestimonialsContent("es").testimonials;
