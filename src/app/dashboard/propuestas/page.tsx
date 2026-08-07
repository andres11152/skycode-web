import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAllProposals } from "@/lib/queries/proposals";
import { ProposalsBoard } from "@/components/dashboard/ProposalsBoard";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Propuestas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardProposalsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "proposals:read")) redirect("/dashboard");

  const proposals = await getAllProposals();

  return <ProposalsBoard initialProposals={proposals} origin={siteUrl} />;
}
