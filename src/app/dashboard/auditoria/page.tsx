import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getAuditLogPage } from "@/lib/queries/audit";
import { AuditLogTable } from "@/components/dashboard/AuditLogTable";

export const metadata: Metadata = {
  title: "Auditoría | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}

export default async function DashboardAuditPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "audit:read")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const action = sp.action || "ALL";
  const page = Math.max(1, Number(sp.page) || 1);

  const { entries, total, actions } = await getAuditLogPage({ q, action, page, pageSize: PAGE_SIZE });

  return (
    <AuditLogTable entries={entries} total={total} page={page} pageSize={PAGE_SIZE} q={q} action={action} actions={actions} />
  );
}
