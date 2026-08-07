import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getUserTimeEntries } from "@/lib/queries/timeEntries";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { TimeEntriesView } from "@/components/dashboard/TimeEntriesView";

export const metadata: Metadata = {
  title: "Mis Horas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardTimeEntriesPage() {
  const session = await requireSessionOrRedirect();
  // Mismo gate que /api/time-entries (canLogTime): registrar horas exige
  // poder ver proyectos, así el selector no filtra títulos/clientes a
  // quien no debería verlos (ej. traffiker).
  if (!hasPermission(session.role, "projects:read")) redirect("/dashboard");

  const [entries, projects] = await Promise.all([getUserTimeEntries(session.id), getAllActiveProjects()]);

  return (
    <TimeEntriesView
      initialEntries={entries}
      projects={projects.map((p) => ({ id: p.id, title: p.title, sprints: p.sprints }))}
    />
  );
}
