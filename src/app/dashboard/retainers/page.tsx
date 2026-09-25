import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getRetainers } from "@/lib/queries/retainers";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { RetainersBoard } from "@/components/dashboard/RetainersBoard";

export const metadata: Metadata = {
  title: "Retainers | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardRetainersPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "invoices:read")) redirect("/dashboard");

  const [retainers, projects] = await Promise.all([getRetainers(), getAllActiveProjects()]);
  const canWrite = hasPermission(session.role, "invoices:write");

  return (
    <RetainersBoard
      retainers={retainers}
      projects={projects.map((p) => ({ id: p.id, title: p.title, client: p.client }))}
      canWrite={canWrite}
    />
  );
}
