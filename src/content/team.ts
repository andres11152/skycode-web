import teamDataEs from "./locales/es/team.json";
import teamDataEn from "./locales/en/team.json";
import teamDataFr from "./locales/fr/team.json";
import type { Locale } from "@/lib/i18n";
import type { PublicTeamNetworkItem, PublicTeamSection, PublicTeamStat } from "./teamShared";

// Desde la Fase 5 de perfiles, este archivo SOLO trae el copy de la
// sección (título, descripción, CTA) — las personas en sí se leen de
// Postgres (`team_profiles`, ver lib/queries/teamProfiles.ts) para que
// cambiar una foto o una bio no requiera un deploy. Mismo split que ya
// hicieron `content/projects.ts` (portafolio) y `blog.json` (solo `meta`).
// El JSON original con los miembros quedó archivado en
// scripts/seed-data/team/ para el script de migración de datos.

const teamByLocale = { es: teamDataEs, en: teamDataEn, fr: teamDataFr };

export function getTeamSectionContent(locale: Locale): PublicTeamSection {
  const data = teamByLocale[locale];
  return {
    sectionAria: data.sectionAria,
    title: data.title,
    description: data.description,
    ctaLabel: data.ctaLabel,
    ...("heroEyebrow" in data && typeof data.heroEyebrow === "string"
      ? { heroEyebrow: data.heroEyebrow }
      : {}),
    ...("heroTitleLines" in data && Array.isArray(data.heroTitleLines)
      ? { heroTitleLines: data.heroTitleLines as string[] }
      : {}),
    ...("networkTitle" in data && typeof data.networkTitle === "string"
      ? { networkTitle: data.networkTitle }
      : {}),
    ...("networkDescription" in data && typeof data.networkDescription === "string"
      ? { networkDescription: data.networkDescription }
      : {}),
    ...("networkItems" in data && Array.isArray(data.networkItems)
      ? { networkItems: data.networkItems as PublicTeamNetworkItem[] }
      : {}),
    ...("closingTitle" in data && typeof data.closingTitle === "string"
      ? { closingTitle: data.closingTitle }
      : {}),
    ...("closingDescription" in data && typeof data.closingDescription === "string"
      ? { closingDescription: data.closingDescription }
      : {}),
    ...("ctaSecondary" in data && typeof data.ctaSecondary === "object" && data.ctaSecondary !== null
      ? { ctaSecondary: data.ctaSecondary as { label: string; href: string } }
      : {}),
    ...("stats" in data && Array.isArray(data.stats)
      ? { stats: data.stats as PublicTeamStat[] }
      : {}),
  };
}

/**
 * `<title>`/descripción para buscadores. Aparte de `getTeamSectionContent`
 * a propósito: esa estructura viaja como prop a `TeamView` (cliente) y estos
 * textos solo los necesita `generateMetadata`. El título lleva ≤50
 * caracteres (el layout agrega " | SkyCode").
 */
export function getTeamSeo(locale: Locale): { title: string; description: string } {
  const data = teamByLocale[locale];
  return { title: data.seoTitle, description: data.seoDescription };
}
