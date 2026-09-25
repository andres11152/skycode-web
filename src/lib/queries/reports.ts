import { query } from "../db";
import { getUsdToCopRate } from "../exchangeRate";
import { convertCurrency, type Currency } from "../currency";
import { getProjectProfitability } from "./profitability";

export interface MonthlyRevenuePoint {
  /** `YYYY-MM` */
  month: string;
  totalCop: number;
}

export interface ChannelLeadsPoint {
  channel: string;
  count: number;
  wonCount: number;
}

export interface ProjectStatusPoint {
  status: string;
  count: number;
}

export interface ExecutiveReport {
  monthlyRevenue: MonthlyRevenuePoint[];
  leadsByChannel: ChannelLeadsPoint[];
  projectsByStatus: ProjectStatusPoint[];
  kpis: {
    revenueLast12MonthsCop: number;
    leadsLast12Months: number;
    conversionRatePct: number | null;
    avgMarginPct: number | null;
  };
}

/** Los 12 meses (incluido el actual) como claves `YYYY-MM`, más viejo primero — para que un mes sin ingresos aparezca en el gráfico como una barra en cero, no como un hueco silencioso. */
function last12MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

/**
 * Reporte ejecutivo agregado — no hay tabla ni migración propia, es 100%
 * derivado de `payments`/`leads`/`campaigns`/`projects` más
 * `getProjectProfitability()` (reutilizada tal cual, no duplicada) para el
 * margen promedio. Mismo criterio de "vista de solo lectura sin estado
 * propio" que Capacidad/Proyección de caja.
 *
 * `usdToCopRate` se resuelve una sola vez y se pasa a `getProjectProfitability`
 * para no disparar un segundo fetch/caché-fría de la tasa en el mismo request.
 */
export async function getExecutiveReport(prefetchedRate?: number): Promise<ExecutiveReport> {
  const usdToCopRate = prefetchedRate ?? (await getUsdToCopRate());

  const [paymentsRes, leadsRes, projectsRes, profitability] = await Promise.all([
    query(`
      SELECT to_char(date_trunc('month', pay.paid_at), 'YYYY-MM') AS month, pay.amount, i.currency
      FROM payments pay
      JOIN invoices i ON i.id = pay.invoice_id
      WHERE pay.paid_at >= (CURRENT_DATE - interval '12 months') AND i.deleted_at IS NULL;
    `),
    query(`
      SELECT COALESCE(c.channel::text, 'sin_campana') AS channel, l.status
      FROM leads l
      LEFT JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.created_at >= (CURRENT_DATE - interval '12 months') AND l.deleted_at IS NULL;
    `),
    query(`SELECT status, COUNT(*) AS count FROM projects WHERE deleted_at IS NULL GROUP BY status;`),
    getProjectProfitability(usdToCopRate),
  ]);

  const monthKeys = last12MonthKeys();
  const revenueByMonth = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  for (const row of paymentsRes.rows) {
    const month = String(row.month);
    if (!revenueByMonth.has(month)) continue; // fuera de la ventana de 12 meses por algún desfase de zona horaria — se descarta, no se inventa una barra 13
    const amountCop = convertCurrency(Number(row.amount), row.currency as Currency, "COP", usdToCopRate);
    revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + amountCop);
  }
  const monthlyRevenue: MonthlyRevenuePoint[] = monthKeys.map((month) => ({ month, totalCop: revenueByMonth.get(month) ?? 0 }));

  const channelMap = new Map<string, { count: number; wonCount: number }>();
  for (const row of leadsRes.rows) {
    const channel = String(row.channel);
    const entry = channelMap.get(channel) ?? { count: 0, wonCount: 0 };
    entry.count += 1;
    if (row.status === "Ganado") entry.wonCount += 1;
    channelMap.set(channel, entry);
  }
  const leadsByChannel: ChannelLeadsPoint[] = Array.from(channelMap.entries())
    .map(([channel, v]) => ({ channel, count: v.count, wonCount: v.wonCount }))
    .sort((a, b) => b.count - a.count);

  const projectsByStatus: ProjectStatusPoint[] = projectsRes.rows.map((r) => ({
    status: String(r.status),
    count: Number(r.count),
  }));

  const revenueLast12MonthsCop = monthlyRevenue.reduce((sum, m) => sum + m.totalCop, 0);
  const leadsLast12Months = leadsByChannel.reduce((sum, c) => sum + c.count, 0);
  const wonLeads = leadsByChannel.reduce((sum, c) => sum + c.wonCount, 0);
  const conversionRatePct = leadsLast12Months > 0 ? (wonLeads / leadsLast12Months) * 100 : null;

  const billedProjects = profitability.filter((p) => p.totalBilledCop > 0);
  const avgMarginPct =
    billedProjects.length > 0
      ? billedProjects.reduce((sum, p) => sum + (p.marginVsBilledCop / p.totalBilledCop) * 100, 0) / billedProjects.length
      : null;

  return {
    monthlyRevenue,
    leadsByChannel,
    projectsByStatus,
    kpis: { revenueLast12MonthsCop, leadsLast12Months, conversionRatePct, avgMarginPct },
  };
}
