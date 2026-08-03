import type { Metadata } from "next";
import { getSiteText, ogImageUrl, siteName, siteUrl } from "@/lib/site";
import { localeOgLocale, type Locale } from "@/lib/i18n";

const otherOgLocales: Record<Locale, string[]> = {
  es: ["en_US", "fr_FR"],
  en: ["es_419", "fr_FR"],
  fr: ["es_419", "en_US"],
};

/** Metadata (título/OG/hreflang) para las homes localizadas ("/", "/en", "/fr"). */
export function buildHomeMetadata(locale: Locale, path: string): Metadata {
  const { siteTagline, siteDescription } = getSiteText(locale);
  const title = `${siteName} — ${siteTagline}`;

  return {
    title,
    description: siteDescription,
    alternates: {
      canonical: path,
      languages: {
        es: `${siteUrl}/`,
        en: `${siteUrl}/en`,
        fr: `${siteUrl}/fr`,
        "x-default": `${siteUrl}/`,
      },
    },
    openGraph: {
      type: "website",
      locale: localeOgLocale[locale],
      alternateLocale: otherOgLocales[locale],
      url: `${siteUrl}${path}`,
      siteName,
      title,
      description: siteDescription,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteDescription,
      images: [ogImageUrl],
    },
  };
}
