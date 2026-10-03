import { PortfolioIndexView } from "@/components/portfolio/PortfolioIndexView";
import { getPortfolioSectionContent } from "@/content/projects";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import type { Locale } from "@/lib/i18n";

/** Server Component compartido por `/portafolio`, `/en/portfolio` y `/fr/portfolio`. */
export async function PortfolioIndexPage({ locale }: { locale: Locale }) {
  const projects = await getPublishedPortfolioProjects(locale);
  return <PortfolioIndexView locale={locale} projects={projects} sectionCopy={getPortfolioSectionContent(locale)} />;
}
