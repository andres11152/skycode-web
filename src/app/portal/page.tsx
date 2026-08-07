import { requireSessionOrRedirect } from "@/lib/withAuth";
import { getClientProjects } from "@/lib/queries/projects";
import { ProjectsBoard } from "@/components/dashboard/ProjectsBoard";

export default async function PortalPage() {
  const session = await requireSessionOrRedirect();
  const projects = session.clientId ? await getClientProjects(session.clientId) : [];

  return <ProjectsBoard initialProjects={projects} variant="portal" />;
}
