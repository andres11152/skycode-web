import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortfolioSectionContent } from "@/content/projects";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { getPortfolioLocaleMapCached, getPortfolioProjectCached } from "@/lib/portfolioRequestData";
import { localeOgLocale, locales, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";
import { fitTitle, truncateAtWord } from "@/lib/seoText";

// Server-only (importa queries a Postgres): los componentes cliente usan
// `lib/portfolioPaths.ts`, nunca este archivo.

/** hreflang del índice: las tres versiones siempre existen (el copy de sección está en los 3 idiomas). */
export function portfolioIndexAlternates(): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${siteUrl}${portfolioIndexPath(locale)}`])),
    "x-default": `${siteUrl}${portfolioIndexPath("es")}`,
  };
}

/** hreflang de un caso: solo los idiomas con traducción REAL (español siempre). */
export function portfolioCaseAlternates(slug: string, available: Locale[]): Record<string, string> {
  const present = locales.filter((locale) => locale === "es" || available.includes(locale));
  return {
    ...Object.fromEntries(present.map((locale) => [locale, `${siteUrl}${portfolioCasePath(locale, slug)}`])),
    "x-default": `${siteUrl}${portfolioCasePath("es", slug)}`,
  };
}

function otherOgLocales(locale: Locale): string[] {
  return locales.filter((l) => l !== locale).map((l) => localeOgLocale[l]);
}

export function buildPortfolioIndexMetadata(locale: Locale): Metadata {
  const copy = getPortfolioSectionContent(locale);
  const title = copy.meta.indexTitle;
  const url = `${siteUrl}${portfolioIndexPath(locale)}`;

  return {
    title,
    description: copy.description,
    alternates: { canonical: portfolioIndexPath(locale), languages: portfolioIndexAlternates() },
    openGraph: {
      type: "website",
      locale: localeOgLocale[locale],
      alternateLocale: otherOgLocales(locale),
      url,
      siteName,
      title,
      description: copy.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description: copy.description, images: [ogImageUrl] },
  };
}

export async function buildPortfolioCaseMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const [project, localeMap] = await Promise.all([
    getPortfolioProjectCached(slug, locale),
    getPortfolioLocaleMapCached(),
  ]);
  // Nunca `{}`: heredaría título y canonical de la home (ver blogMetadata).
  if (!project) notFound();

  const available = localeMap.find((entry) => entry.slug === slug)?.locales ?? ["es"];
  const coverUrl = project.coverImage?.variants.lg ?? ogImageUrl;
  const path = portfolioCasePath(locale, project.slug);
  // `<title>` ≤50 (el layout agrega " | SkyCode") y descripción ≤155: el título
  // y el resumen completos siguen siendo el H1 y el texto visible de la página.
  const copy = getPortfolioSectionContent(locale);
  const seoTitle = fitTitle(project.title, 50, copy.meta.caseTitleSuffix);
  const seoDescription = truncateAtWord(project.summary, 155);

  return {
    // Sin sufijo propio: el layout ya agrega " | SkyCode Agency" (antes quedaba "… | Casos de Éxito SKYCODE | SkyCode Agency").
    title: seoTitle,
    description: seoDescription,
    // Un caso sin traducción real sirve el texto en español bajo la URL del idioma: se mantiene
    // navegable (el equipo puede revisarlo) pero fuera del índice de buscadores.
    ...(project.translated ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical: path, languages: portfolioCaseAlternates(project.slug, available) },
    openGraph: {
      type: "article",
      locale: localeOgLocale[locale],
      url: `${siteUrl}${path}`,
      siteName,
      title: seoTitle,
      description: seoDescription,
      images: [{ url: coverUrl, width: 1200, height: 630, alt: project.title }],
    },
    twitter: { card: "summary_large_image", title: seoTitle, description: seoDescription, images: [coverUrl] },
  };
}

