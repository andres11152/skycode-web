import teamDataEs from "./locales/es/team.json";
import teamDataEn from "./locales/en/team.json";
import teamDataFr from "./locales/fr/team.json";
import type { Locale } from "@/lib/i18n";

const teamByLocale = { es: teamDataEs, en: teamDataEn, fr: teamDataFr };

export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  description: string;
  /** Ruta relativa a /public. Null si el miembro aún no tiene foto (usa avatar con iniciales). */
  photo: string | null;
}

export function getTeamContent(locale: Locale) {
  const data = teamByLocale[locale];
  return {
    sectionAria: data.sectionAria,
    title: data.title,
    description: data.description,
    ctaLabel: data.ctaLabel,
    members: data.members.map((m) => ({
      slug: m.slug,
      name: m.name,
      role: m.role,
      description: m.description,
      photo: m.photo ?? null,
    })) satisfies TeamMember[],
  };
}
