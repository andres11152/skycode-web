import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getCashProjection } from "@/lib/queries/cashProjection";
import { CashProjectionView } from "@/components/dashboard/CashProjectionView";

export const metadata: Metadata = {
  title: "Proyección de Caja | SKYCODE Agency",
  robots: { index: false, follow: false },
};

/**
 * Mismo permiso que Rentabilidad (`profitability:read`, solo admin) — es
 * el mismo tipo de dato financiero agregado de toda la agencia, no un
 * módulo operativo delegable a sales_manager.
 */
export default async function DashboardCashProjectionPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "profitability:read")) redirect("/dashboard");

  const projection = await getCashProjection();

  return <CashProjectionView projection={projection} />;
}
