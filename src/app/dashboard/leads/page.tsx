import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getActiveLeadsPage, getLeadStats } from "@/lib/queries/leads";
import { getAssignableLeadOwners } from "@/lib/queries/team";
import { LeadsTable } from "@/components/dashboard/LeadsTable";

export const metadata: Metadata = {
  title: "Leads y Ventas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 10;

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function DashboardLeadsPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "leads:read")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const status = sp.status || "ALL";
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ leads, total }, stats, owners] = await Promise.all([
    getActiveLeadsPage({ q, status, page, pageSize: PAGE_SIZE }),
    getLeadStats(),
    getAssignableLeadOwners(),
  ]);

  return (
    <LeadsTable
      leads={leads}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      q={q}
      status={status}
      owners={owners}
      stats={stats}
      canWrite={hasPermission(session.role, "leads:write")}
    />
  );
}
