import { redirect } from "next/navigation";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getLeadStats } from "@/lib/queries/leads";
import { getAllActiveProjects } from "@/lib/queries/projects";
import { getCampaignsWithMetrics } from "@/lib/queries/campaigns";
import { getAllProposals } from "@/lib/queries/proposals";
import { getAllInvoices } from "@/lib/queries/invoices";
import { getProjectProfitability } from "@/lib/queries/profitability";
import { getUsdToCopRate } from "@/lib/exchangeRate";
import { convertCurrency } from "@/lib/currency";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";

export default async function DashboardIndexPage() {
  const session = await requireSessionOrRedirect();

  // Solo el admin tiene permiso para los seis módulos a la vez, así que
  // solo el admin ve el resumen ejecutivo — el resto va directo a la
  // primera sección a la que sí tiene acceso.
  if (session.role === "admin") {
    const usdToCopRate = await getUsdToCopRate();
    const [leadStats, projects, campaigns, proposals, invoices, profitability] = await Promise.all([
      getLeadStats(),
      getAllActiveProjects(),
      getCampaignsWithMetrics(),
      getAllProposals(),
      getAllInvoices(),
      getProjectProfitability(usdToCopRate),
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
      <h1 className="text-lg font-bold text-background">Sin módulos disponibles todavía</h1>
      <p className="text-xs text-background/60">
        Tu rol ({session.role}) no tiene acceso a ninguna sección del panel por ahora.
      </p>
    </div>
  );
}
