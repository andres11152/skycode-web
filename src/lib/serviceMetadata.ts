import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/content/services";
import { getServiceSeo, getServicesIndexSeo } from "@/content/serviceSeo";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { servicePath, servicesIndexPath } from "@/lib/servicePaths";
import type { Locale } from "@/lib/i18n";

export { servicePath, servicesIndexPath } from "@/lib/servicePaths";

export function buildServicesIndexMetadata(locale: Locale): Metadata {
  const seo = getServicesIndexSeo(locale);

  return {
    title: seo.title,
    description: seo.description,
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
      title: seo.title,
      description: seo.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: seo.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [ogImageUrl],
    },
  };
}

export function buildServiceMetadata(locale: Locale, slug: string): Metadata {
  const service = getServiceBySlug(slug, locale);
  // Nunca `{}`: heredaría título y canonical de la home.
  if (!service) notFound();
  const seo = getServiceSeo(slug, locale);
  const title = seo?.title ?? service.title;
  const description = seo?.description ?? service.description;

  return {
    title,
    description,
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
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
