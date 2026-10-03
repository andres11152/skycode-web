import type { Metadata } from "next";
import { ServicesIndexView } from "@/components/services/ServicesIndexView";
import { buildServicesIndexMetadata } from "@/lib/serviceMetadata";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";

export const metadata: Metadata = buildServicesIndexMetadata("es");

// Los casos reales salen de Postgres: respaldo de 1h + revalidación bajo
// demanda al publicar un caso (lib/revalidatePortfolio.ts).
export const revalidate = 3600;

export default async function ServiciosPage() {
  const projects = await getPublishedPortfolioProjects("es");
  return <ServicesIndexView locale="es" projects={projects} />;
}
