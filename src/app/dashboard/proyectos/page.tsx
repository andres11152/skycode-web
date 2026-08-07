import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { ProjectsBoard } from "@/components/dashboard/ProjectsBoard";

export const metadata: Metadata = {
  title: "Proyectos | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardProjectsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "projects:read")) redirect("/dashboard");

  const projects = await getAllActiveProjects();

  return <ProjectsBoard initialProjects={projects} />;
}
