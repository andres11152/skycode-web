import { redirect } from "next/navigation";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getLeadStats } from "@/lib/queries/leads";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { getCampaignsWithMetrics } from "@/lib/queries/campaigns";
import { getAllProposals } from "@/lib/queries/proposals";
import { getAllInvoices } from "@/lib/queries/invoices";
import { getProjectProfitability } from "@/lib/queries/profitability";
import { getAllTickets } from "@/lib/queries/supportTickets";
import { getExpensesPage } from "@/lib/queries/expenses";
import { getClientsPage } from "@/lib/queries/clients";
import { getTeamMembers } from "@/lib/queries/team";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { convertCurrency } from "@/lib/currency";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import type { SupportTicket } from "@/components/dashboard/types";

function countOverdueTickets(openTickets: SupportTicket[]): number {
  const now = Date.now();
  return openTickets.filter((t) => new Date(t.sla_due_at).getTime() < now).length;
}

export default async function DashboardIndexPage() {
  const session = await requireSessionOrRedirect();

  // Solo el admin tiene permiso para todos los módulos a la vez, así que
  // solo el admin ve el resumen ejecutivo — el resto va directo a la
  // primera sección a la que sí tiene acceso.
  if (session.role === "admin") {
    const usdToCopRate = await getUsdToCopRate();
    const [leadStats, projects, campaigns, proposals, invoices, profitability, tickets, expensesPage, clientsPage, team] =
      await Promise.all([
        getLeadStats(),
        getAllActiveProjects(),
        getCampaignsWithMetrics(),
        getAllProposals(),
        getAllInvoices(),
        getProjectProfitability(usdToCopRate),
        getAllTickets(),
        getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 1 }),
        getClientsPage({ q: "", page: 1, pageSize: 1, usdToCopRate }),
        getTeamMembers(),
      ]);

    // Convertido a COP antes de sumar — una campaña en USD y otra en COP,
    // o una factura en cada moneda, no se pueden acumular directamente.
    const totalCampaignSpend = campaigns.reduce(
      (sum, c) => sum + convertCurrency(c.totalSpend, c.currency, "COP", usdToCopRate),
      0
    );
    const totalReceivable = invoices
      .filter((i) => i.status !== "paid")
      .reduce((sum, i) => sum + convertCurrency(i.balance, i.currency, "COP", usdToCopRate), 0);
    const totalOverdue = invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + convertCurrency(i.balance, i.currency, "COP", usdToCopRate), 0);
    const totalMargin = profitability.reduce((sum, p) => sum + p.marginVsBilledCop, 0);

    const openTickets = tickets.filter((t) => t.status !== "Resuelto" && t.status !== "Cerrado");
    const overdueTicketsCount = countOverdueTickets(openTickets);

    return (
      <ExecutiveSummary
        leadStats={{ total: leadStats.total, newCount: leadStats.newCount }}
        activeProjectsCount={projects.length}
        activeCampaignsCount={campaigns.filter((c) => c.status === "active").length}
        totalCampaignSpend={totalCampaignSpend}
        pendingProposalsCount={proposals.filter((p) => p.status === "sent" || p.status === "viewed").length}
        totalReceivable={totalReceivable}
        totalOverdue={totalOverdue}
        totalMargin={totalMargin}
        clientsCount={clientsPage.total}
        openTicketsCount={openTickets.length}
        overdueTicketsCount={overdueTicketsCount}
        expensesThisMonth={expensesPage.totalThisMonthCop}
        activeTeamCount={team.filter((m) => m.status === "active").length}
        usdToCopRate={usdToCopRate}
      />
    );
  }

  if (hasPermission(session.role, "leads:read")) redirect("/dashboard/leads");
  if (hasPermission(session.role, "projects:read")) redirect("/dashboard/proyectos");
  if (hasPermission(session.role, "campaigns:read")) redirect("/dashboard/campanas");
  if (hasPermission(session.role, "proposals:read")) redirect("/dashboard/propuestas");
  if (hasPermission(session.role, "invoices:read")) redirect("/dashboard/facturacion");
  if (hasPermission(session.role, "team:read")) redirect("/dashboard/equipo");

  return (
    <div className="py-20 text-center space-y-2">
      <h1 className="text-lg font-bold text-foreground">Sin módulos disponibles todavía</h1>
      <p className="text-xs text-foreground/60">
        Tu rol ({session.role}) no tiene acceso a ninguna sección del panel por ahora.
      </p>
    </div>
  );
}
