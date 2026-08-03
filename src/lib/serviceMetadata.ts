import type { Metadata } from "next";
import { getServiceBySlug, getServicesContent } from "@/content/services";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";

/** Ruta absoluta (sin dominio) de una página de servicio para un locale dado. */
export function servicePath(locale: Locale, slug: string): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/servicios/${slug}`;
}

/** Ruta absoluta (sin dominio) del índice de servicios para un locale dado. */
export function servicesIndexPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/servicios`;
}

export function buildServicesIndexMetadata(locale: Locale): Metadata {
  const { servicesSection } = getServicesContent(locale);

  return {
    title: servicesSection.title,
    description: servicesSection.description,
    alternates: {
      canonical: servicesIndexPath(locale),
      languages: {
        es: `${siteUrl}${servicesIndexPath("es")}`,
        en: `${siteUrl}${servicesIndexPath("en")}`,
        fr: `${siteUrl}${servicesIndexPath("fr")}`,
        "x-default": `${siteUrl}${servicesIndexPath("es")}`,
      },
    },
    openGraph: {
      type: "website",
      title: servicesSection.title,
      description: servicesSection.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: servicesSection.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: servicesSection.title,
      description: servicesSection.description,
      images: [ogImageUrl],
    },
  };
}

export function buildServiceMetadata(locale: Locale, slug: string): Metadata {
  const service = getServiceBySlug(slug, locale);
  if (!service) return {};

  return {
    title: service.title,
    description: service.description,
    alternates: {
      canonical: servicePath(locale, slug),
      languages: {
        es: `${siteUrl}${servicePath("es", slug)}`,
        en: `${siteUrl}${servicePath("en", slug)}`,
        fr: `${siteUrl}${servicePath("fr", slug)}`,
        "x-default": `${siteUrl}${servicePath("es", slug)}`,
      },
    },
    openGraph: {
      type: "website",
      title: service.title,
      description: service.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description: service.description,
      images: [ogImageUrl],
    },
  };
}
