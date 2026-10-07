import serviceDetailsEs from "./locales/es/service-details.json";
import serviceDetailsEn from "./locales/en/service-details.json";
import serviceDetailsFr from "./locales/fr/service-details.json";
import { fillPricingTokensDeep } from "./pricingTokens";
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
  /**
   * Sección H2 "Desarrollo de [servicio] en Colombia" (SEO local). Texto
   * propio de cada servicio e idioma — nunca el mismo párrafo copiado.
   * `facts` lleva los datos de negocio pendientes (precio, plazo) como
   * marcadores `{{TODO: …}}`, cada uno en su propia viñeta: en producción
   * `withoutTodos()` (lib/todoPlaceholders.ts) omite la viñeta completa.
   */
  colombia?: { heading: string; paragraphs: string[]; facts: string[] };
  /**
   * Evidencia de primera mano: cifras medidas en el propio sitio de SkyCode
   * (documentadas en el repositorio), no promesas genéricas. Solo datos
   * verificables — nunca resultados de clientes inventados.
   */
  proof?: { heading: string; intro: string; items: { label: string; value: string; text: string }[] };
}

const detailsByLocale: Record<Locale, Record<string, ServiceDetails>> = {
  es: serviceDetailsEs,
  en: serviceDetailsEn,
  fr: serviceDetailsFr,
};

/** Los textos pueden traer tokens de precio/plazo (`{price.web}`, `{priceUsd.web}`, `{weeks.web}`): se resuelven aquí con las cifras del cotizador. */
export function getServiceDetails(slug: string, locale: Locale): ServiceDetails | undefined {
  const details = detailsByLocale[locale][slug];
  return details ? fillPricingTokensDeep(details) : undefined;
}
