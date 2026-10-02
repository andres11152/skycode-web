import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getTeamMemberDetail } from "@/lib/queries/team";
import { getActiveUserSessions } from "@/lib/queries/sessions";
import { getUserActivity } from "@/lib/queries/audit";
import { TeamMemberDetailView } from "@/components/dashboard/TeamMemberDetailView";

export const metadata: Metadata = {
  title: "Ficha de Persona | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Ficha de una persona del equipo interno — mismo patrón que la ficha de
 * cliente (`/dashboard/clientes/[id]`). `team:read` para ver (admin hoy).
 *
 * Una cuenta `client` responde 404 acá a propósito: esta es la ficha del
 * EQUIPO (misma regla que `getTeamMembers()`, que los excluye); los
 * clientes se administran desde su ficha de cliente.
 */
export default async function DashboardTeamMemberPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "team:read")) redirect("/dashboard");

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const [member, sessions, activity] = await Promise.all([
    getTeamMemberDetail(userId),
    getActiveUserSessions(userId),
    getUserActivity(userId),
  ]);
  if (!member || member.role === "client") notFound();

  return (
    <TeamMemberDetailView
      member={member}
      sessions={sessions}
      activity={activity}
      isSelf={String(session.id) === String(member.id)}
      canWrite={hasPermission(session.role, "team:write")}
    />
  );
}
