import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getTeamMembers } from "@/lib/queries/team";
import { TeamTable } from "@/components/dashboard/TeamTable";

export const metadata: Metadata = {
  title: "Equipo | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardTeamPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "team:read")) redirect("/dashboard");

  const members = await getTeamMembers();

  return <TeamTable initialMembers={members} currentUserId={session.id} />;
}
