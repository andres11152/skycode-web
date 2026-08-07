import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAllInvoices } from "@/lib/queries/invoices";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { InvoicesBoard } from "@/components/dashboard/InvoicesBoard";

export const metadata: Metadata = {
  title: "Facturación | SKYCODE Agency",
  robots: { index: false, follow: false },
};

export default async function DashboardInvoicesPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "invoices:read")) redirect("/dashboard");

  const [invoices, projects, usdToCopRate] = await Promise.all([
    getAllInvoices(),
    getAllActiveProjects(),
    getUsdToCopRate(),
  ]);
  const canWrite = hasPermission(session.role, "invoices:write");

  return (
    <InvoicesBoard
      initialInvoices={invoices}
      projects={projects.map((p) => ({ id: p.id, title: p.title, client: p.client }))}
      canWrite={canWrite}
      usdToCopRate={usdToCopRate}
    />
  );
}
