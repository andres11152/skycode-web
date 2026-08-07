import { query } from "../db";
import type { Campaign, CampaignSpendEntry } from "@/components/dashboard/types";

const CPL_SPIKE_THRESHOLD = 1.5; // 50% por encima del CPL promedio del sistema

/**
 * Todas las campañas activas con sus métricas calculadas: inversión total,
 * leads atribuidos, ganados, costo por lead y conversión. El "se dispara
 * contra su propio promedio" del roadmap se resuelve comparando el CPL de
 * cada campaña contra el promedio de CPL de todas las campañas con leads
 * (no hay suficiente historial por campaña individual para una serie de
 * tiempo propia todavía).
 */
export async function getCampaignsWithMetrics(): Promise<Campaign[]> {
  const res = await query(`
    SELECT
      c.id, c.name, c.channel, c.utm_campaign, c.objective, c.budget, c.currency,
      c.starts_at, c.ends_at, c.status, c.created_at,
      COALESCE(spend.total_spend, 0) AS total_spend,
      COALESCE(leads_agg.lead_count, 0) AS lead_count,
      COALESCE(leads_agg.won_count, 0) AS won_count
    FROM campaigns c
    LEFT JOIN (
      SELECT campaign_id, SUM(amount) AS total_spend FROM campaign_spend GROUP BY campaign_id
    ) spend ON spend.campaign_id = c.id
    LEFT JOIN (
      SELECT campaign_id, COUNT(*) AS lead_count, COUNT(*) FILTER (WHERE status = 'Ganado') AS won_count
      FROM leads WHERE deleted_at IS NULL AND campaign_id IS NOT NULL GROUP BY campaign_id
    ) leads_agg ON leads_agg.campaign_id = c.id
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC;
  `);

  const rows = res.rows.map((row) => {
    const totalSpend = Number(row.total_spend);
    const leadCount = Number(row.lead_count);
    const wonCount = Number(row.won_count);
    const budget = row.budget !== null ? Number(row.budget) : null;
    return {
      id: row.id,
      name: row.name,
      channel: row.channel,
      utm_campaign: row.utm_campaign,
      objective: row.objective,
      budget,
      currency: row.currency,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
      created_at: row.created_at,
      totalSpend,
      leadCount,
      wonCount,
      cpl: leadCount > 0 ? totalSpend / leadCount : null,
      conversionRate: leadCount > 0 ? wonCount / leadCount : null,
      overBudget: budget !== null && totalSpend > budget,
      cplSpike: false, // se completa abajo, necesita el promedio del set completo
    };
  });

  const cplsWithLeads = rows.map((r) => r.cpl).filter((cpl): cpl is number => cpl !== null);
  const avgCpl = cplsWithLeads.length > 0 ? cplsWithLeads.reduce((a, b) => a + b, 0) / cplsWithLeads.length : null;

  return rows.map((r) => ({
    ...r,
    cplSpike: avgCpl !== null && r.cpl !== null && r.cpl > avgCpl * CPL_SPIKE_THRESHOLD,
  }));
}

export async function getCampaignSpend(campaignId: number): Promise<CampaignSpendEntry[]> {
  const res = await query(
    `SELECT id, campaign_id, spend_date, amount, currency FROM campaign_spend WHERE campaign_id = $1 ORDER BY spend_date DESC;`,
    [campaignId]
  );
  return res.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateCampaignData {
  name: string;
  channel: string;
  utm_campaign?: string | null;
  objective?: string | null;
  budget?: number | null;
  currency?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

/**
 * Crea una nueva campaña publicitaria.
 */
export async function createCampaign(data: CreateCampaignData, userId: number | string, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `INSERT INTO campaigns (name, channel, utm_campaign, objective, budget, currency, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *;`,
    [
      data.name,
      data.channel,
      data.utm_campaign || null,
      data.objective || null,
      data.budget ?? null,
      data.currency || "COP",
      data.starts_at || null,
      data.ends_at || null,
      userId,
    ]
  );
  return res.rows[0];
}

export interface UpdateCampaignData {
  name?: string;
  budget?: number | null;
  status?: string;
  starts_at?: string;
  ends_at?: string;
}

/**
 * Actualiza nombre, presupuesto, estado o fechas de una campaña.
 */
export async function updateCampaign(id: number, data: UpdateCampaignData, dbRunner: QueryRunner) {
  const before = await dbRunner.query("SELECT * FROM campaigns WHERE id = $1 AND deleted_at IS NULL;", [id]);
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE campaigns
     SET name = COALESCE($1, name),
         budget = CASE WHEN $2 THEN $3 ELSE budget END,
         status = COALESCE($4, status),
         starts_at = COALESCE($5, starts_at),
         ends_at = COALESCE($6, ends_at)
     WHERE id = $7
     RETURNING *;`,
    [
      data.name ?? null,
      data.budget !== undefined,
      data.budget ?? null,
      data.status ?? null,
      data.starts_at ?? null,
      data.ends_at ?? null,
      id,
    ]
  );

  return { before: before.rows[0], after: res.rows[0] };
}

/**
 * Borrado lógico de una campaña.
 */
export async function softDeleteCampaign(id: number, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `UPDATE campaigns SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *;`,
    [id]
  );
  return res.rows[0] ?? null;
}

export interface AddCampaignSpendData {
  spend_date: string;
  amount: number;
  currency?: string;
}

/**
 * Registra o actualiza la inversión diaria de una campaña.
 */
export async function addCampaignSpend(
  campaignId: number,
  data: AddCampaignSpendData,
  userId: number | string,
  dbRunner: QueryRunner
) {
  const campaignExists = await dbRunner.query(
    "SELECT id, currency FROM campaigns WHERE id = $1 AND deleted_at IS NULL;",
    [campaignId]
  );
  if (campaignExists.rows.length === 0) return null;

  const res = await dbRunner.query(
    `INSERT INTO campaign_spend (campaign_id, spend_date, amount, currency, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (campaign_id, spend_date) DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency
     RETURNING id, campaign_id, spend_date, amount, currency;`,
    [campaignId, data.spend_date, data.amount, data.currency || campaignExists.rows[0].currency, userId]
  );

  return res.rows[0];
}

