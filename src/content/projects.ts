import { BrainCircuit, Car, Globe, Rocket, ShieldCheck, ShoppingCart, Truck, Workflow, type LucideIcon } from "lucide-react";
import projectsDataEs from "./locales/es/projects.json";
import projectsDataEn from "./locales/en/projects.json";
import projectsDataFr from "./locales/fr/projects.json";
import type { Locale } from "@/lib/i18n";

const coverIconMap: Record<string, LucideIcon> = {
  BrainCircuit,
  ShoppingCart,
  Rocket,
  Globe,
  Workflow,
  Truck,
  Car,
  ShieldCheck,
};

const projectsByLocale = { es: projectsDataEs, en: projectsDataEn, fr: projectsDataFr };

export interface Project {
  slug: string;
  title: string;
  client: string;
  description: string;
  tags: string[];
  link?: string;
  coverImage?: string;
  /** Capturas reales adicionales, cuando el cliente las autoriza (ver Lightbox). */
  gallery?: string[];
  coverIcon: LucideIcon;
}

export function getProjectsContent(locale: Locale) {
  const projectsData = projectsByLocale[locale];
  return {
    projectsSection: { title: projectsData.title, description: projectsData.description },
    projects: projectsData.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      client: item.client,
      description: item.description,
      tags: item.tags,
      link: "link" in item ? (item.link as string | undefined) : undefined,
      coverImage: "coverImage" in item ? (item.coverImage as string | undefined) : undefined,
      gallery: "gallery" in item ? (item.gallery as string[] | undefined) : undefined,
      coverIcon: coverIconMap[item.iconName] ?? ShoppingCart,
    })) satisfies Project[],
  };
}

export function getProjectBySlug(slug: string, locale: Locale = "es"): Project | undefined {
  return getProjectsContent(locale).projects.find((project) => project.slug === slug);
}

// Español por defecto — usado por JSON-LD y por las páginas de detalle (ver AGENTS.md: el
// mismo patrón ES-only que ya aplica al blog y a lo legal, sin rutas por idioma).
export const projectsSection = getProjectsContent("es").projectsSection;
export const projects = getProjectsContent("es").projects;
