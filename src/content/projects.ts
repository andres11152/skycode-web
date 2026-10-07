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

export interface PortfolioLightboxCopy {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  /** Anuncio para lectores de pantalla, con `{index}` y `{total}`. */
  position: string;
}

export interface PortfolioRelatedCopy {
  title: string;
  service: string;
  services: string;
  posts: string;
  /** Frase corta que antecede al enlace a la página local de Bogotá. */
  bogotaLead: string;
  /** Texto del enlace (anchor descriptivo) a la página de desarrollo de software en Bogotá. */
  bogotaLabel: string;
}

export interface PortfolioDetailCopy {
  client: string;
  capabilities: string;
  liveSite: string;
  visitSite: string;
  stack: string;
  context: string;
  challenge: string;
  solution: string;
  architecture: string;
  process: string;
  results: string;
  metrics: string;
  testimonial: string;
  related: PortfolioRelatedCopy;
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
  /** Plantilla con `{title}` e `{index}` — alt de cada captura cuando no tiene texto alternativo propio. */
  captureAlt: string;
  lightbox: PortfolioLightboxCopy;
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
  breadcrumb: { home: string; aria: string; portfolio: string };
  meta: { indexTitle: string; caseTitleSuffix: string };
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
    breadcrumb: data.breadcrumb,
    meta: data.meta,
  };
}
