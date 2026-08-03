import type { Metadata } from "next";
import { getTeamContent } from "@/content/team";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";

export function teamPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/equipo`;
}

export function buildTeamMetadata(locale: Locale): Metadata {
  const teamData = getTeamContent(locale);

  return {
    title: teamData.title,
    description: teamData.description,
    alternates: {
      canonical: teamPath(locale),
      languages: {
        es: `${siteUrl}${teamPath("es")}`,
        en: `${siteUrl}${teamPath("en")}`,
        fr: `${siteUrl}${teamPath("fr")}`,
        "x-default": `${siteUrl}${teamPath("es")}`,
      },
    },
    openGraph: {
      type: "website",
      title: teamData.title,
      description: teamData.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: teamData.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: teamData.title,
      description: teamData.description,
      images: [ogImageUrl],
    },
  };
}
