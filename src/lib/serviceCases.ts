import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import { SERVICE_PROJECT_SLUGS } from "@/content/services";
import type { PortfolioProject } from "@/content/portfolioShared";
import type { Locale } from "@/lib/i18n";

/**
 * Casos publicados del portafolio donde se aplicó un servicio, en el orden
 * de `SERVICE_PROJECT_SLUGS`. Server-only (llega a `lib/db.ts`): las
 * páginas lo llaman y le pasan el resultado por prop a `ServiceView`. Un
 * slug que no esté publicado simplemente no aparece; sin Postgres (build
 * en CI) `getPublishedPortfolioProjects` devuelve `[]` y la sección no se
 * renderiza.
 */
export async function getServiceCaseProjects(serviceSlug: string, locale: Locale): Promise<PortfolioProject[]> {
  const slugs = SERVICE_PROJECT_SLUGS[serviceSlug] ?? [];
  if (slugs.length === 0) return [];
  const projects = await getPublishedPortfolioProjects(locale);
  return slugs
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project): project is PortfolioProject => project !== undefined);
}
