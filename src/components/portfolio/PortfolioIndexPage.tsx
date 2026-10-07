import { PortfolioIndexView } from "@/components/portfolio/PortfolioIndexView";
import { getPortfolioSectionContent } from "@/content/projects";
import { toIndexItem, topTechnologies } from "@/content/portfolioShared";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import type { Locale } from "@/lib/i18n";

/** Server Component compartido por `/portafolio`, `/en/portfolio` y `/fr/portfolio`. */
export async function PortfolioIndexPage({ locale }: { locale: Locale }) {
  const projects = await getPublishedPortfolioProjects(locale);
  // El índice es un componente cliente: se le pasa solo el resumen de cada caso (ver `PortfolioIndexItem`),
  // no los capítulos de texto ni la galería completa que sí necesita el detalle.
  return (
    <PortfolioIndexView
      locale={locale}
      projects={projects.map(toIndexItem)}
      technologies={topTechnologies(projects, 8)}
      sectionCopy={getPortfolioSectionContent(locale)}
    />
  );
}
