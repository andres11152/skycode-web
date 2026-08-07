import { query } from "../db";
import type { Lead, LeadActivity } from "@/components/dashboard/types";

const LEADS_SELECT = `
  SELECT l.id, l.name, l.email, l.phone, l.service, l.budget, l.currency, l.estimated_weeks,
         l.message, l.source, l.status, l.created_at,
         l.utm_source, l.utm_medium, l.utm_campaign, l.referrer, l.landing_page,
         u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
         COUNT(*) OVER() AS total_count
  FROM leads l
  LEFT JOIN users u ON u.id = l.owner_id
`;

function shapeLeadRow(row: Record<string, unknown>): Lead {
  const ownerId = row.owner_id ? Number(row.owner_id) : null;
  const ownerName = typeof row.owner_name === "string" ? row.owner_name : null;
  const ownerEmail = typeof row.owner_email === "string" ? row.owner_email : null;

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    service: String(row.service ?? ""),
    budget: String(row.budget ?? ""),
    currency: String(row.currency ?? "COP"),
    estimated_weeks: Number(row.estimated_weeks ?? 4),
    message: String(row.message ?? ""),
    source: String(row.source ?? ""),
    status: (row.status as Lead["status"]) ?? "Nuevo",
    created_at: String(row.created_at ?? ""),
    utm_source: row.utm_source ? String(row.utm_source) : undefined,
    utm_medium: row.utm_medium ? String(row.utm_medium) : undefined,
    utm_campaign: row.utm_campaign ? String(row.utm_campaign) : undefined,
    referrer: row.referrer ? String(row.referrer) : undefined,
    landing_page: row.landing_page ? String(row.landing_page) : undefined,
    owner: ownerId && ownerName && ownerEmail ? { id: ownerId, name: ownerName, email: ownerEmail } : null,
  };
}

export interface LeadsPageParams {
  q: string;
  status: string; // "ALL" o uno de los 4 estados
  page: number;
  pageSize: number;
}

export interface LeadsPageResult {
  leads: Lead[];
  total: number;
}

function buildLeadWhereClause({ q, status }: Pick<LeadsPageParams, "q" | "status">) {
  const conditions = ["l.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.service ILIKE $${idx})`);
  }
  if (status !== "ALL") {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }

  return { conditions, params };
}

/**
 * Búsqueda, filtro y paginación resueltos en SQL — antes se traía la tabla
 * `leads` entera al navegador y se filtraba/paginaba ahí, algo que
 * funciona con decenas de registros pero no escala.
 */
export async function getActiveLeadsPage({ q, status, page, pageSize }: LeadsPageParams): Promise<LeadsPageResult> {
  const { conditions, params } = buildLeadWhereClause({ q, status });

  params.push(pageSize);
  const limitIdx = params.length;
  params.push((page - 1) * pageSize);
  const offsetIdx = params.length;

  const res = await query(
    `${LEADS_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY l.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
    params
  );

  const total = res.rows[0] ? Number(res.rows[0].total_count) : 0;
  return { leads: res.rows.map(shapeLeadRow), total };
}

/**
 * Todos los leads activos que calzan un filtro, sin paginar — para el
 * export a CSV, que debe traer todo lo filtrado, no solo la página visible.
 */
export async function getAllMatchingLeads({ q, status }: Pick<LeadsPageParams, "q" | "status">): Promise<Lead[]> {
  const { conditions, params } = buildLeadWhereClause({ q, status });

  const res = await query(`${LEADS_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY l.created_at DESC;`, params);
  return res.rows.map(shapeLeadRow);
}

export interface LeadStats {
  total: number;
  newCount: number;
  wonCount: number;
}

/**
 * Cifras globales para las tarjetas de KPI del panel — a propósito no
 * respetan el filtro de búsqueda/estado actual (mostrarían "3 de 3" al
 * filtrar, que no dice nada útil). Una sola consulta de agregación.
 */
export async function getLeadStats(): Promise<LeadStats> {
  const res = await query(
    `SELECT
       COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
       COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Nuevo') AS new_count,
       COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Ganado') AS won_count
     FROM leads;`
  );
  const row = res.rows[0];
  return { total: Number(row.total), newCount: Number(row.new_count), wonCount: Number(row.won_count) };
}

export async function getLeadActivities(leadId: number): Promise<LeadActivity[]> {
  const res = await query(
    `SELECT id, lead_id, actor_name, type, body, created_at FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC;`,
    [leadId]
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    lead_id: Number(row.lead_id),
    actor_name: String(row.actor_name ?? ""),
    type: row.type as LeadActivity["type"],
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
  }));
}

export interface CreateLeadData {
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  budget?: string | null;
  currency?: string | null;
  estimatedWeeks?: number | null;
  message?: string | null;
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
}

interface QueryRunner {
  query: typeof query;
}

/**
 * Inserta un nuevo lead con resolución automática de campaña por UTM.
 */
export async function createLead(data: CreateLeadData, dbRunner?: QueryRunner) {
  const executor = dbRunner ?? { query };

  let campaignId: number | null = null;
  if (data.utm_campaign) {
    const campaignMatch = await executor.query(
      "SELECT id FROM campaigns WHERE utm_campaign = $1 AND deleted_at IS NULL LIMIT 1;",
      [data.utm_campaign]
    );
    campaignId = campaignMatch.rows[0]?.id ?? null;
  }

  const res = await executor.query(
    `INSERT INTO leads (
       name, email, phone, service, budget, currency, estimated_weeks, message, source, status,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, referrer, landing_page, campaign_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Nuevo', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING id, name, email, created_at;`,
    [
      data.name,
      data.email.toLowerCase(),
      data.phone || "",
      data.service || "Desarrollo General",
      data.budget || "A convenir",
      data.currency || "COP",
      data.estimatedWeeks || 4,
      data.message || "",
      data.source || "Sitio Web Directo",
      data.utm_source || null,
      data.utm_medium || null,
      data.utm_campaign || null,
      data.utm_term || null,
      data.utm_content || null,
      data.gclid || null,
      data.fbclid || null,
      data.referrer || null,
      data.landing_page || null,
      campaignId,
    ]
  );

  return res.rows[0];
}

export interface UpdateLeadParams {
  id: number;
  status?: string;
  ownerId?: number | null;
  campaignId?: number | null;
}

/**
 * Actualiza estado, propietario o campaña de un lead dentro de un cliente/transacción.
 */
export async function updateLeadStatusAndOwner(
  { id, status, ownerId, campaignId }: UpdateLeadParams,
  dbRunner: QueryRunner
) {
  const before = await dbRunner.query(
    "SELECT status, owner_id, campaign_id FROM leads WHERE id = $1 AND deleted_at IS NULL;",
    [id]
  );
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE leads SET
       status = COALESCE($1, status),
       owner_id = CASE WHEN $2 THEN $3 ELSE owner_id END,
       campaign_id = CASE WHEN $4 THEN $5 ELSE campaign_id END
     WHERE id = $6 RETURNING id, status, owner_id, campaign_id;`,
    [status ?? null, ownerId !== undefined, ownerId ?? null, campaignId !== undefined, campaignId ?? null, id]
  );

  return { before: before.rows[0], after: res.rows[0] };
}

/**
 * Borrado lógico (deleted_at) de un prospecto.
 */
export async function softDeleteLead(id: number, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `UPDATE leads SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *;`,
    [id]
  );
  return res.rows[0] ?? null;
}

export interface AddLeadActivityParams {
  leadId: number;
  actorId?: number | string | null;
  actorName: string;
  type: LeadActivity["type"];
  body: string;
}

/**
 * Registra una interacción o cambio automático de estado en el timeline del prospecto.
 */
export async function addLeadActivity(
  { leadId, actorId, actorName, type, body }: AddLeadActivityParams,
  dbRunner?: QueryRunner
): Promise<LeadActivity | null> {
  const executor = dbRunner ?? { query };

  const leadExists = await executor.query("SELECT id FROM leads WHERE id = $1 AND deleted_at IS NULL;", [leadId]);
  if (leadExists.rows.length === 0) return null;

  const res = await executor.query(
    `INSERT INTO lead_activities (lead_id, actor_id, actor_name, type, body) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, lead_id, actor_name, type, body, created_at;`,
    [leadId, actorId ?? null, actorName, type, body]
  );

  const row = res.rows[0];
  return {
    id: Number(row.id),
    lead_id: Number(row.lead_id),
    actor_name: String(row.actor_name ?? ""),
    type: row.type as LeadActivity["type"],
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}


