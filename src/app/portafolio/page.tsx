import type { Metadata } from "next";
import { PortfolioIndexView } from "@/components/portfolio/PortfolioIndexView";
import { getPortfolioSectionContent } from "@/content/projects";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import { defaultLocale } from "@/lib/i18n";

// El portafolio es ES-only (sin rutas /en//fr, ver CLAUDE.md), así que
// siempre lee `defaultLocale`. Fallback de una hora por si la
// revalidación bajo demanda (ver el `PATCH .../status` de portfolio) no
// llega a dispararse — mismo criterio que el sitemap del blog.
export const revalidate = 3600;

const sectionCopy = getPortfolioSectionContent(defaultLocale);

export const metadata: Metadata = {
  title: sectionCopy.title,
  description: sectionCopy.description,
  alternates: {
    canonical: "/portafolio",
  },
};

export default async function PortafolioPage() {
  const projects = await getPublishedPortfolioProjects(defaultLocale);
  return <PortfolioIndexView projects={projects} sectionCopy={sectionCopy} />;
}
