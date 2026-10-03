import teamDataEs from "./locales/es/team.json";
import teamDataEn from "./locales/en/team.json";
import teamDataFr from "./locales/fr/team.json";
import type { Locale } from "@/lib/i18n";
import type { PublicTeamSection } from "./teamShared";

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
  };
}
