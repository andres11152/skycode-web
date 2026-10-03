import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAdminTeamProfiles } from "@/lib/queries/teamProfiles";
import { TeamProfilesBoard } from "@/components/dashboard/TeamProfilesBoard";

export const metadata: Metadata = {
  title: "Perfiles públicos | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardTeamProfilesPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "team:read")) redirect("/dashboard");

  const profiles = await getAdminTeamProfiles();
  return <TeamProfilesBoard initialProfiles={profiles} canWrite={hasPermission(session.role, "team:write")} />;
}
