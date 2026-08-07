import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getProjectProfitability, getCampaignProfitability } from "@/lib/queries/profitability";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { ProfitabilityView } from "@/components/dashboard/ProfitabilityView";

export const metadata: Metadata = {
  title: "Rentabilidad | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardProfitabilityPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "profitability:read")) redirect("/dashboard");

  // Se resuelve una sola vez y se pasa a ambas consultas — evita que
  // getProjectProfitability/getCampaignProfitability disparen cada una su
  // propio fetch concurrente cuando la caché en memoria todavía está fría.
  const usdToCopRate = await getUsdToCopRate();
  const [projects, campaigns] = await Promise.all([
    getProjectProfitability(usdToCopRate),
    getCampaignProfitability(usdToCopRate),
  ]);

  return <ProfitabilityView projects={projects} campaigns={campaigns} usdToCopRate={usdToCopRate} />;
}
