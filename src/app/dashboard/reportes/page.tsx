import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getExecutiveReport } from "@/lib/queries/reports";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { ReportsView } from "@/components/dashboard/ReportsView";

export const metadata: Metadata = {
  title: "Reportes Ejecutivos | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardReportsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "profitability:read")) redirect("/dashboard");

  const usdToCopRate = await getUsdToCopRate();
  const report = await getExecutiveReport(usdToCopRate);

  return <ReportsView report={report} usdToCopRate={usdToCopRate} />;
}
