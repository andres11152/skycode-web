import { requireSessionOrRedirect } from "@/lib/withAuth";
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
import { TodayShell } from "@/components/dashboard/TodayShell";
import { getAttentionGroups } from "@/lib/queries/attention";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import type { SupportTicket } from "@/components/dashboard/types";

function countOverdueTickets(openTickets: SupportTicket[]): number {
  const now = Date.now();
  return openTickets.filter((t) => new Date(t.sla_due_at).getTime() < now).length;
}

export default async function DashboardIndexPage() {
  const session = await requireSessionOrRedirect();

  // "Requiere tu atención" lo ven todos los roles (cada categoría respeta el
  // permiso del rol). Solo el admin tiene permiso para todos los módulos a la
  // vez, así que solo él ve además el resumen ejecutivo; el resto ve accesos
  // a sus módulos (ver TodayShell).
  const groups = await getAttentionGroups(session.id, session.role);

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
      <TodayShell name={session.name} role={session.role} groups={groups}>
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
      </TodayShell>
    );
  }

  return <TodayShell name={session.name} role={session.role} groups={groups} />;
}
