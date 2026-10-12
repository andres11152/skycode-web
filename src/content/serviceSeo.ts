import { getPageSeo, SERVICE_CLUSTER_IDS, type ClusterId } from "@/seo/keyword-map";
import type { Locale } from "@/lib/i18n";

/**
 * `<title>`, meta description y H1 pensados para buscadores — distintos del
 * título visible del carrusel/tarjeta (`services.json`), que no lleva la
 * palabra clave con la que la gente busca el servicio.
 *
 * Desde el programa de remediación SEO NO viven en un JSON propio: salen del
 * mapa de keywords (`src/seo/keyword-map.ts`), que es la fuente única de qué
 * URL es dueña de cada búsqueda. Así dos páginas no pueden compartir título ni
 * H1 sin que un test lo impida. Sigue siendo server-only por la misma razón de
 * siempre (ver `serviceDetails.ts`): no lo importes desde un `"use client"`.
 *
 * Límites (los verifica `keywordMap.test.ts`): el layout agrega " | SkyCode"
 * (10 caracteres) → `title` ≤ 50; `description` entre 140 y 155.
 */
export interface ServiceSeo {
  title: string;
  description: string;
  h1: string;
}

const isServiceCluster = (slug: string): slug is (typeof SERVICE_CLUSTER_IDS)[number] =>
  (SERVICE_CLUSTER_IDS as readonly string[]).includes(slug);

export function getServiceSeo(slug: string, locale: Locale): ServiceSeo | undefined {
  if (!isServiceCluster(slug)) return undefined;
  const { title, description, h1 } = getPageSeo(slug as ClusterId, locale);
  return { title, description, h1 };
}

export function getServicesIndexSeo(locale: Locale): ServiceSeo {
  const { title, description, h1 } = getPageSeo("services-index", locale);
  return { title, description, h1 };
}
