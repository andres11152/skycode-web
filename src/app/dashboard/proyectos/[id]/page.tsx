import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getProjectById } from "@/lib/queries/projects";
import { getProjectTasks } from "@/lib/queries/tasks";
import { getProjectDocuments } from "@/lib/queries/documents";
import { getActiveTeamMembers } from "@/lib/queries/team";
import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";

export const metadata: Metadata = {
  title: "Detalle de Proyecto | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardProjectDetailPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "projects:read")) redirect("/dashboard");

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();

  const project = await getProjectById(projectId);
  if (!project) notFound();

  const canReadTasks = hasPermission(session.role, "tasks:read");
  const canWriteTasks = hasPermission(session.role, "tasks:write");
  const canReadDocuments = hasPermission(session.role, "documents:read");
  const canWriteDocuments = hasPermission(session.role, "documents:write");

  const [tasks, teamMembers, documents] = await Promise.all([
    canReadTasks ? getProjectTasks(projectId) : Promise.resolve([]),
    canWriteTasks ? getActiveTeamMembers() : Promise.resolve([]),
    canReadDocuments ? getProjectDocuments(projectId) : Promise.resolve([]),
  ]);

  return (
    <ProjectDetailView
      project={project}
      tasks={tasks}
      teamMembers={teamMembers}
      canReadTasks={canReadTasks}
      canWriteTasks={canWriteTasks}
      documents={documents}
      canReadDocuments={canReadDocuments}
      canWriteDocuments={canWriteDocuments}
      currentUserId={session.id}
    />
  );
}
