import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getActiveLeadsPage, getAllMatchingLeads, getLeadStats } from "@/lib/queries/leads";
import { getAssignableLeadOwners } from "@/lib/queries/team";
import { LeadsTable } from "@/components/dashboard/LeadsTable";

export const metadata: Metadata = {
  title: "Leads y Ventas | SKYCODE Agency",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 10;

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string; view?: string }>;
}

export default async function DashboardLeadsPage({ searchParams }: PageProps) {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "leads:read")) redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const status = sp.status || "ALL";
  const page = Math.max(1, Number(sp.page) || 1);
  const view = sp.view === "kanban" ? "kanban" : "table";

  const [stats, owners] = await Promise.all([getLeadStats(), getAssignableLeadOwners()]);

  // En Kanban las 4 columnas SON el filtro de estado, así que se ignora
  // `status` de la URL y se traen TODOS los leads activos que calzan la
  // búsqueda, sin paginar — mismo criterio sin límite que los tableros de
  // Soporte/Tareas (getAllTickets/getProjectTasks), que tampoco paginan.
  const { leads, total } =
    view === "kanban"
      ? await getAllMatchingLeads({ q, status: "ALL" }).then((all) => ({ leads: all, total: all.length }))
      : await getActiveLeadsPage({ q, status, page, pageSize: PAGE_SIZE });

  return (
    <LeadsTable
      leads={leads}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      q={q}
      status={status}
      view={view}
      owners={owners}
      stats={stats}
      canWrite={hasPermission(session.role, "leads:write")}
    />
  );
}
