import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAllTechnologies, getTechnologyUsageCounts } from "@/lib/queries/portfolioTechnologies";
import { TechnologyCatalog } from "@/components/dashboard/TechnologyCatalog";

export const metadata: Metadata = {
  title: "Tecnologías del portafolio | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardPortfolioTechnologiesPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "portfolio:read")) redirect("/dashboard");

  const [technologies, usageCounts] = await Promise.all([getAllTechnologies(), getTechnologyUsageCounts()]);
  const initialTechnologies = technologies.map((tech) => ({ ...tech, projectCount: usageCounts.get(tech.id) ?? 0 }));
  const canWrite = hasPermission(session.role, "portfolio:write");

  return <TechnologyCatalog initialTechnologies={initialTechnologies} canWrite={canWrite} />;
}
