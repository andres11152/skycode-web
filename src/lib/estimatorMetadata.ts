import type { Metadata } from "next";
import { getProjectEstimatorContent } from "@/content/projectEstimator";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";

/** Ruta absoluta (sin dominio) del cotizador para un locale dado — mismo
 * patrón que `servicesIndexPath` en lib/serviceMetadata.ts. */
export function estimatorPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/cotizador`;
}

export function buildEstimatorMetadata(locale: Locale): Metadata {
  const content = getProjectEstimatorContent(locale);

  return {
    title: content.title,
    description: content.subtitle,
    alternates: {
      canonical: estimatorPath(locale),
      languages: {
        es: `${siteUrl}${estimatorPath("es")}`,
        en: `${siteUrl}${estimatorPath("en")}`,
        fr: `${siteUrl}${estimatorPath("fr")}`,
        "x-default": `${siteUrl}${estimatorPath("es")}`,
      },
    },
    openGraph: {
      type: "website",
      title: content.title,
      description: content.subtitle,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: content.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.subtitle,
      images: [ogImageUrl],
    },
  };
}
