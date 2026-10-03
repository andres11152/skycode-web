import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { countArticlesByAuthorSlug, getAdminTeamProfile } from "@/lib/queries/teamProfiles";
import { getActiveTeamMembers } from "@/lib/queries/team";
import { TeamProfileEditor } from "@/components/dashboard/TeamProfileEditor";

export const metadata: Metadata = {
  title: "Editar perfil público | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardTeamProfileEditPage({ params }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "team:read")) redirect("/dashboard");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const profile = await getAdminTeamProfile(id);
  if (!profile) notFound();

  const [teamAccounts, authoredArticles] = await Promise.all([
    getActiveTeamMembers(),
    countArticlesByAuthorSlug(profile.slug),
  ]);

  return (
    <TeamProfileEditor
      profile={profile}
      teamAccounts={teamAccounts}
      authoredArticles={authoredArticles}
      canWrite={hasPermission(session.role, "team:write")}
    />
  );
}
