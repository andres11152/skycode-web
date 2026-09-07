import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getClientsPage } from "@/lib/queries/clients";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { ClientsTable } from "@/components/dashboard/ClientsTable";

export const metadata: Metadata = {
  title: "Clientes | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 15;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function DashboardClientsPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "clients:read")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const usdToCopRate = await getUsdToCopRate();
  const { clients, total } = await getClientsPage({ q, page, pageSize: PAGE_SIZE, usdToCopRate });

  return <ClientsTable clients={clients} total={total} page={page} pageSize={PAGE_SIZE} q={q} />;
}
