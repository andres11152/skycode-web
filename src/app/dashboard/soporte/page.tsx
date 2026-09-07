import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAllTickets } from "@/lib/queries/supportTickets";
import { getProjectOptions } from "@/lib/queries/projects";
import { getActiveTeamMembers } from "@/lib/queries/team";
import { SupportTicketsBoard } from "@/components/dashboard/SupportTicketsBoard";

export const metadata: Metadata = {
  title: "Soporte | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardSupportPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "support:read")) redirect("/dashboard");

  const canWrite = hasPermission(session.role, "support:write");

  const [tickets, projects, teamMembers] = await Promise.all([
    getAllTickets(),
    canWrite ? getProjectOptions() : Promise.resolve([]),
    canWrite ? getActiveTeamMembers() : Promise.resolve([]),
  ]);

  return <SupportTicketsBoard initialTickets={tickets} projects={projects} teamMembers={teamMembers} canWrite={canWrite} />;
}
