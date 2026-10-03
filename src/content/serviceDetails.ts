import serviceDetailsEs from "./locales/es/service-details.json";
import serviceDetailsEn from "./locales/en/service-details.json";
import serviceDetailsFr from "./locales/fr/service-details.json";
import type { Locale } from "@/lib/i18n";

/**
 * Contenido editorial extendido de la página de detalle de un servicio
 * (problema, proceso, entregables, casos de uso, FAQ, lecturas). Los textos
 * admiten enlaces internos `[texto](/ruta)`, ver lib/inlineLinks.ts.
 *
 * Vive APARTE de `services.json` a propósito: `content/services.ts` lo
 * importan componentes cliente que viajan en todas las páginas (Footer,
 * Contact, el carrusel de la home), y meter aquí ~25 KB gzip de texto por
 * idioma los arrastraba al bundle del navegador de todo el sitio (medido:
 * el detalle de un servicio pasó de 269 a 293 KB). Solo deben importar este
 * módulo Server Components (`ServiceView`, `ServiceJsonLd`) — no hay lint
 * que lo atrape; antes de usarlo en un `"use client"`, mide el bundle.
 */
export interface ServiceDetails {
  intro: string[];
  /** "El problema": lo que suele estar pasando antes de contratar el servicio — contrasta con `steps` (cómo se resuelve). */
  challenge?: { heading: string; points: string[] };
  /** Entregables concretos al cierre (repositorio, documentación, etc.) — distintos de `features`, que describen capacidades. */
  deliverables?: string[];
  stepsHeading: string;
  steps: { title: string; text: string }[];
  useCasesHeading?: string;
  useCases?: string[];
  faqHeading: string;
  faqs: { question: string; answer: string }[];
  relatedHeading?: string;
  related?: { label: string; href: string; description: string }[];
}

const detailsByLocale: Record<Locale, Record<string, ServiceDetails>> = {
  es: serviceDetailsEs,
  en: serviceDetailsEn,
  fr: serviceDetailsFr,
};

export function getServiceDetails(slug: string, locale: Locale): ServiceDetails | undefined {
  return detailsByLocale[locale][slug];
}
