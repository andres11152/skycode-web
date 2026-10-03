import projectsDataEs from "./locales/es/projects.json";
import projectsDataEn from "./locales/en/projects.json";
import projectsDataFr from "./locales/fr/projects.json";
import type { Locale } from "@/lib/i18n";

// Desde la Fase 5 de la migración del portafolio a Postgres, este archivo
// SOLO trae el copy de UI de la sección (badge/título/descripción/labels de
// botones) — los casos de estudio en sí ya no viven acá, se leen de
// Postgres vía `lib/queries/portfolio.ts` (ver CLAUDE.md, "Portafolio").
// Mismo patrón que `content/blog.ts` dejó `blog.json` con solo `meta`
// después de migrar los posts a la tabla `articles`.

const projectsByLocale = { es: projectsDataEs, en: projectsDataEn, fr: projectsDataFr };

export interface PortfolioIndexCopy {
  countLabel: string;
  stackLabel: string;
  empty: string;
  ctaTitle: string;
  ctaButton: string;
}

export interface PortfolioDetailCopy {
  client: string;
  capabilities: string;
  liveSite: string;
  visitSite: string;
  stack: string;
  challenge: string;
  solution: string;
  results: string;
  metrics: string;
  gallery: string;
  galleryPrev: string;
  galleryNext: string;
  galleryRegion: string;
  expandImage: string;
  approachTitle: string;
  approach: string[];
  nextCase: string;
  viewAllCases: string;
  ctaTitle: string;
  ctaButton: string;
}

export interface PortfolioSectionCopy {
  badge: string;
  title: string;
  description: string;
  viewAll: string;
  featuredBadge: string;
  viewCaseStudy: string;
  exploreProject: string;
  index: PortfolioIndexCopy;
  detail: PortfolioDetailCopy;
}

export function getPortfolioSectionContent(locale: Locale): PortfolioSectionCopy {
  const data = projectsByLocale[locale];
  return {
    badge: data.badge,
    title: data.title,
    description: data.description,
    viewAll: data.viewAll,
    featuredBadge: data.featuredBadge,
    viewCaseStudy: data.viewCaseStudy,
    exploreProject: data.exploreProject,
    index: data.index,
    detail: data.detail,
  };
}
