import { Buildings, Car, FlowArrow, Globe, Graph, House, Rocket, ShieldCheck, ShoppingCart, Truck } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Locale } from "@/lib/i18n";

// Tipos + funciones puras del portafolio (sin ningún import de lib/db.ts
// ni de lib/queries/portfolio.ts) — mismo criterio de separación que
// content/blogShared.ts vs. content/blog.ts: un componente cliente
// (Portfolio.tsx, PortfolioIndexView, ProjectView) necesita estos tipos y
// el mapa de íconos sin arrastrar `pg` a su bundle del navegador.

export const PORTFOLIO_ICON_MAP: Record<string, Icon> = {
  Graph,
  Buildings,
  ShoppingCart,
  Rocket,
  Globe,
  FlowArrow,
  Truck,
  Car,
  ShieldCheck,
  House,
};

/** Catálogo cerrado — el admin del panel solo puede elegir de esta lista, ver PortfolioForm.tsx. */
export const PORTFOLIO_ICON_NAMES = Object.keys(PORTFOLIO_ICON_MAP) as (keyof typeof PORTFOLIO_ICON_MAP)[];

export type PortfolioStatus = "draft" | "published" | "archived";

export type PortfolioTechCategory = "frontend" | "backend" | "database" | "infra" | "mobile" | "ai" | "integration" | "other";

export const PORTFOLIO_TECH_CATEGORIES: PortfolioTechCategory[] = [
  "frontend",
  "backend",
  "database",
  "infra",
  "mobile",
  "ai",
  "integration",
  "other",
];

export interface PortfolioImageVariants {
  sm: string;
  md: string;
  lg: string;
}

export interface PortfolioImage {
  id: number;
  variants: PortfolioImageVariants;
  width: number;
  height: number;
  /** Ya resuelto al locale pedido (con fallback a español), no el JSONB crudo — ver `resolveLocalizedText()`. */
  alt: string;
}

export interface PortfolioTechnology {
  id: number;
  slug: string;
  name: string;
  category: PortfolioTechCategory;
  iconSource: "simple-icons" | "custom";
  iconRef: string;
  websiteUrl: string | null;
}

export interface PortfolioMetric {
  value: string;
  /** Ya resuelto al locale pedido (con fallback a español). */
  label: string;
}

export interface PortfolioProject {
  slug: string;
  status: PortfolioStatus;
  isFeatured: boolean;
  liveUrl: string | null;
  industryIcon: string;
  title: string;
  clientLabel: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  capabilities: string[];
  technologies: PortfolioTechnology[];
  images: PortfolioImage[];
  coverImage: PortfolioImage | null;
  metrics: PortfolioMetric[];
  publishedAt: string | null;
}

/**
 * Resuelve un campo JSONB por idioma (`alt`, `label`) al locale pedido,
 * cayendo a español si falta la traducción — mismo criterio de "ES con
 * EsBadge" que ya usa el resto del sitio para contenido no traducido
 * todavía (ver "Internacionalización" en CLAUDE.md), aplicado acá a nivel
 * de campo individual en vez de documento completo.
 */
export function resolveLocalizedText(value: unknown, locale: Locale): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, string>;
  return record[locale] || record.es || "";
}

export function getPortfolioIcon(name: string): Icon {
  return PORTFOLIO_ICON_MAP[name] ?? Buildings;
}
