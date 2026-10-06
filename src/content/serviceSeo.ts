import serviceSeoEs from "./locales/es/service-seo.json";
import serviceSeoEn from "./locales/en/service-seo.json";
import serviceSeoFr from "./locales/fr/service-seo.json";
import type { Locale } from "@/lib/i18n";

/**
 * `<title>`, meta description y H1 pensados para buscadores — distintos del
 * título visible del carrusel/tarjeta (`services.json`), que no lleva la
 * palabra clave con la que la gente busca el servicio.
 *
 * Vive APARTE de `services.json` por la misma razón que `service-details.json`
 * (ver `serviceDetails.ts`): `content/services.ts` lo importan componentes
 * cliente que viajan en todas las páginas, y estos textos solo los necesitan
 * Server Components. No importes este módulo desde un `"use client"`.
 *
 * Límites (los verifica `serviceSeo.test.ts`): el layout agrega " | SkyCode"
 * (10 caracteres) → `title` ≤ 50 para que el `<title>` final no pase de 60;
 * `description` ≤ 155.
 */
export interface ServiceSeo {
  title: string;
  description: string;
  /** H1 de la página de detalle; si falta se usa el título visible del servicio. */
  h1?: string;
}

interface ServiceSeoFile {
  index: ServiceSeo & { h1: string };
  items: Record<string, ServiceSeo>;
}

const seoByLocale: Record<Locale, ServiceSeoFile> = {
  es: serviceSeoEs,
  en: serviceSeoEn,
  fr: serviceSeoFr,
};

export function getServiceSeo(slug: string, locale: Locale): ServiceSeo | undefined {
  return seoByLocale[locale].items[slug];
}

export function getServicesIndexSeo(locale: Locale): ServiceSeo & { h1: string } {
  return seoByLocale[locale].index;
}
