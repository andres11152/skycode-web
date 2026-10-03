import type { Metadata } from "next";
import { getFaqPageContent } from "@/content/faq";
import { faqPath } from "@/lib/faqPaths";
import { localeOgLocale, locales, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";

export function faqLanguageAlternates(): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${siteUrl}${faqPath(locale)}`])),
    "x-default": `${siteUrl}${faqPath("es")}`,
  };
}

export function buildFaqMetadata(locale: Locale): Metadata {
  const { meta } = getFaqPageContent(locale);
  const url = `${siteUrl}${faqPath(locale)}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: faqPath(locale),
      languages: faqLanguageAlternates(),
    },
    openGraph: {
      type: "website",
      locale: localeOgLocale[locale],
      url,
      siteName,
      title: meta.title,
      description: meta.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogImageUrl],
    },
  };
}
