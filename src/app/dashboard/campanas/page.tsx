import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getCampaignsWithMetrics } from "@/lib/queries/campaigns";
import { CampaignsBoard } from "@/components/dashboard/CampaignsBoard";

export const metadata: Metadata = {
  title: "Campañas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardCampaignsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "campaigns:read")) redirect("/dashboard");

  const campaigns = await getCampaignsWithMetrics();
  const canWrite = hasPermission(session.role, "campaigns:write");

  return <CampaignsBoard initialCampaigns={campaigns} canWrite={canWrite} />;
}
