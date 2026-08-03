import type { Metadata } from "next";
import { PortfolioIndexView } from "@/components/portfolio/PortfolioIndexView";
import { projectsSection } from "@/content/projects";

export const metadata: Metadata = {
  title: projectsSection.title,
  description: projectsSection.description,
  alternates: {
    canonical: "/portafolio",
  },
};

export default function PortafolioPage() {
  return <PortfolioIndexView />;
}
