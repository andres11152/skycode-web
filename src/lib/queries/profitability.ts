import { query } from "../db";
import { getUsdToCopRate } from "../exchangeRate";
import { convertCurrency, type Currency } from "../currency";
import type { ProjectProfitability, CampaignProfitability } from "@/components/dashboard/types";

function usdToCopSqlMultiplier(paramIndex: number, currencyColumn = "currency"): string {
  return `CASE WHEN ${currencyColumn} = 'USD' THEN $${paramIndex}::numeric ELSE 1 END`;
}

/**
 * Cotizado contra costo real de horas contra facturado, todo convertido a
 * COP con la tasa de cambio vigente — sin esto, un proyecto cotizado en
 * USD y facturado en COP se sumaría como si fueran la misma moneda.
 * `quotedAmountOriginal`/`quotedCurrencyOriginal` conservan el monto tal
 * como se cotizó, solo para mostrarlo junto al convertido.
 */
export async function getProjectProfitability(prefetchedRate?: number): Promise<ProjectProfitability[]> {
  const usdToCopRate = prefetchedRate ?? (await getUsdToCopRate());

  const res = await query(
    `
    SELECT
      p.id, p.title, p.status, c.name AS client_name,
      prop.id AS proposal_id, prop.currency AS quoted_currency, prop.tax_rate,
      COALESCE(pi.items_subtotal, 0) AS items_subtotal,
      COALESCE(te.total_hours, 0) AS total_hours,
      COALESCE(te.total_cost_cop, 0) AS total_cost_cop,
      COALESCE(inv.total_billed_cop, 0) AS total_billed_cop
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN proposals prop ON prop.accepted_project_id = p.id
    LEFT JOIN (
      SELECT proposal_id, SUM(quantity * unit_price) AS items_subtotal
      FROM proposal_items GROUP BY proposal_id
    ) pi ON pi.proposal_id = prop.id
    LEFT JOIN (
      SELECT te2.project_id,
             SUM(te2.hours) AS total_hours,
             SUM(te2.hours * COALESCE(u.hourly_cost, 0) * ${usdToCopSqlMultiplier(1, "u.hourly_cost_currency")}) AS total_cost_cop
      FROM time_entries te2 JOIN users u ON u.id = te2.user_id
      GROUP BY te2.project_id
    ) te ON te.project_id = p.id
    LEFT JOIN (
      SELECT project_id,
             SUM(amount * ${usdToCopSqlMultiplier(1, "currency")}) AS total_billed_cop
      FROM invoices WHERE deleted_at IS NULL GROUP BY project_id
    ) inv ON inv.project_id = p.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC;
    `,
    [usdToCopRate]
  );

  return res.rows.map((row) => {
    const totalCostCop = Number(row.total_cost_cop);
    const totalBilledCop = Number(row.total_billed_cop);
    const quotedCurrencyOriginal: Currency | null = row.proposal_id && typeof row.quoted_currency === "string"
      ? (row.quoted_currency as Currency)
      : null;
    const quotedAmountOriginal = row.proposal_id
      ? Number(row.items_subtotal) * (1 + Number(row.tax_rate) / 100)
      : null;
    const quotedAmountCop =
      quotedAmountOriginal !== null && quotedCurrencyOriginal
        ? convertCurrency(quotedAmountOriginal, quotedCurrencyOriginal, "COP", usdToCopRate)
        : null;

    return {
      id: Number(row.id),
      title: String(row.title ?? ""),
      client_name: String(row.client_name ?? ""),
      status: row.status as ProjectProfitability["status"],
      quotedAmountOriginal,
      quotedCurrencyOriginal,
      quotedAmountCop,
      totalHours: Number(row.total_hours),
      totalCostCop,
      totalBilledCop,
      marginVsQuotedCop: quotedAmountCop !== null ? quotedAmountCop - totalCostCop : null,
      marginVsBilledCop: totalBilledCop - totalCostCop,
      deviationPct:
        quotedAmountCop !== null && quotedAmountCop > 0
          ? ((totalCostCop - quotedAmountCop) / quotedAmountCop) * 100
          : null,
    };
  });
}

/**
 * Enlaza inversión publicitaria con margen final, cerrando el circuito
 * anuncio → utilidad. Todo convertido a COP con la tasa vigente antes de
 * sumar — una campaña que se paga en USD (frecuente en Meta/Google Ads)
 * cruzada con un proyecto facturado en COP necesita esa conversión para
 * que el margen neto signifique algo.
 *
 * La atribución campaña→proyecto pasa por `leads.campaign_id` → email del
 * lead → `clients.email` — no hay una FK directa lead→proyecto todavía,
 * así que esto es una aproximación por email, documentada, no una
 * relación garantizada por el esquema.
 */
export async function getCampaignProfitability(prefetchedRate?: number): Promise<CampaignProfitability[]> {
  const usdToCopRate = prefetchedRate ?? (await getUsdToCopRate());

  const res = await query(
    `
    WITH campaign_projects AS (
      SELECT DISTINCT l.campaign_id, p.id AS project_id
      FROM leads l
      JOIN clients c ON c.email = l.email
      JOIN projects p ON p.client_id = c.id AND p.deleted_at IS NULL
      WHERE l.campaign_id IS NOT NULL AND l.deleted_at IS NULL
    ),
    project_financials AS (
      SELECT p.id AS project_id,
             COALESCE(inv.total_billed_cop, 0) AS total_billed_cop,
             COALESCE(cost.total_cost_cop, 0) AS total_cost_cop
      FROM projects p
      LEFT JOIN (
        SELECT project_id, SUM(amount * ${usdToCopSqlMultiplier(1, "currency")}) AS total_billed_cop
        FROM invoices WHERE deleted_at IS NULL GROUP BY project_id
      ) inv ON inv.project_id = p.id
      LEFT JOIN (
        SELECT te.project_id,
               SUM(te.hours * COALESCE(u.hourly_cost, 0) * ${usdToCopSqlMultiplier(1, "u.hourly_cost_currency")}) AS total_cost_cop
        FROM time_entries te JOIN users u ON u.id = te.user_id
        GROUP BY te.project_id
      ) cost ON cost.project_id = p.id
    )
    SELECT camp.id, camp.name, camp.channel,
           COALESCE(spend.total_spend_cop, 0) AS total_spend_cop,
           COALESCE(SUM(pf.total_billed_cop), 0) AS total_billed_cop,
           COALESCE(SUM(pf.total_cost_cop), 0) AS total_cost_cop
    FROM campaigns camp
    LEFT JOIN (
      SELECT campaign_id, SUM(amount * ${usdToCopSqlMultiplier(1, "currency")}) AS total_spend_cop
      FROM campaign_spend GROUP BY campaign_id
    ) spend ON spend.campaign_id = camp.id
    LEFT JOIN campaign_projects cp ON cp.campaign_id = camp.id
    LEFT JOIN project_financials pf ON pf.project_id = cp.project_id
    WHERE camp.deleted_at IS NULL
    GROUP BY camp.id, camp.name, camp.channel, spend.total_spend_cop
    ORDER BY camp.id DESC;
    `,
    [usdToCopRate]
  );

  return res.rows.map((row) => {
    const totalSpendCop = Number(row.total_spend_cop);
    const totalBilledCop = Number(row.total_billed_cop);
    const totalCostCop = Number(row.total_cost_cop);
    const netMarginCop = totalBilledCop - totalCostCop - totalSpendCop;

    return {
      id: Number(row.id),
      name: String(row.name ?? ""),
      channel: row.channel as CampaignProfitability["channel"],
      totalSpendCop,
      totalBilledCop,
      totalCostCop,
      netMarginCop,
      roi: totalSpendCop > 0 ? netMarginCop / totalSpendCop : null,
    };
  });
}

