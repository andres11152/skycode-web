import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAdminPortfolioList } from "@/lib/queries/portfolio";
import { PortfolioBoard } from "@/components/dashboard/PortfolioBoard";

export const metadata: Metadata = {
  title: "Portafolio | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardPortfolioPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "portfolio:read")) redirect("/dashboard");

  const projects = await getAdminPortfolioList();
  const canWrite = hasPermission(session.role, "portfolio:write");

  return <PortfolioBoard initialProjects={projects} canWrite={canWrite} />;
}
