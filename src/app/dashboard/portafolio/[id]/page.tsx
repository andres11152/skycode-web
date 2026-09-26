import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAdminPortfolioDetail } from "@/lib/queries/portfolio";
import { getAllTechnologies } from "@/lib/queries/portfolioTechnologies";
import { PortfolioEditor } from "@/components/dashboard/PortfolioEditor";

export const metadata: Metadata = {
  title: "Editar caso de portafolio | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

export default async function DashboardPortfolioEditPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "portfolio:read")) redirect("/dashboard");

  const projectId = parseProjectId((await params).id);
  if (projectId === null) notFound();

  const [project, allTechnologies] = await Promise.all([
    getAdminPortfolioDetail(projectId),
    getAllTechnologies(),
  ]);
  if (!project) notFound();

  const canWrite = hasPermission(session.role, "portfolio:write");

  return <PortfolioEditor project={project} allTechnologies={allTechnologies} canWrite={canWrite} />;
}
