import { query } from "../db";
import type { Lead, LeadActivity } from "@/components/dashboard/types";

const LEADS_SELECT = `
  SELECT l.id, l.name, l.email, l.phone, l.service, l.budget, l.currency, l.estimated_weeks,
         l.message, l.source, l.status, l.created_at,
         l.utm_source, l.utm_medium, l.utm_campaign, l.referrer, l.landing_page,
         l.next_follow_up_at::text AS next_follow_up_at, l.follow_up_note,
         l.anonymized_at,
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
    // `l.next_follow_up_at::text` en el SELECT de arriba, a propósito: `pg`
    // devuelve una columna DATE como objeto `Date` (no string) salvo que se
    // le pida texto — un objeto `Date` a partir de una fecha pura, sin hora,
    // puede desalinearse un día al leerlo de vuelta según la zona horaria
    // del proceso Node (mismo riesgo que documentan los tests de
    // invoices.integration.test.ts). El cast a texto en SQL evita el
    // problema de raíz: nunca pasa por un `Date` de JS.
    next_follow_up_at: row.next_follow_up_at ? String(row.next_follow_up_at) : null,
    follow_up_note: row.follow_up_note ? String(row.follow_up_note) : null,
    anonymized_at: row.anonymized_at ? String(row.anonymized_at) : null,
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
  /** Timestamp de cuándo la persona marcó la casilla de autorización de
   * tratamiento de datos (Ley 1581) — `undefined`/no pasado significa que
   * el caller no exigió consentimiento explícito (nunca debería pasar en
   * un endpoint público, ver /api/contact, /api/leads,
   * /api/estimator/quote-email, que lo exigen server-side con
   * `consent: z.literal(true)` antes de siquiera llamar acá). Se guarda el
   * momento exacto, no solo un booleano, para poder demostrar cumplimiento
   * ante la SIC si hace falta. */
  consentGivenAt?: Date | null;
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
       utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, referrer, landing_page, campaign_id,
       consent_given_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Nuevo', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING id, name, email, created_at;`,
    [
      data.name,
      data.email.toLowerCase(),
      data.phone || "",
      data.service || null,
      data.budget || "A convenir",
      data.currency || "COP",
      data.estimatedWeeks || 4,
      data.message || "",
      data.source || null,
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
      data.consentGivenAt ?? null,
    ]
  );

  return res.rows[0];
}

export type AnonymizeLeadResult = { outcome: "ok" } | { outcome: "not_found" } | { outcome: "already_anonymized" };

/**
 * Anonimiza un lead — mismo patrón exacto que `anonymizeClient()`
 * (lib/queries/dataPrivacy.ts): reemplaza nombre/teléfono/mensaje/email
 * por valores genéricos en vez de un DELETE físico, para conservar la fila
 * y sus `lead_activities` como rastro de auditoría interno. A diferencia
 * de un cliente, un lead no tiene facturas/pagos que sustentar
 * contablemente, así que no hay ninguna excepción legal que impida ir más
 * lejos — se mantiene la anonimización (en vez de un DELETE real) solo por
 * consistencia con el resto del sistema y para no romper el historial de
 * actividades del prospecto. Irreversible, sin endpoint para deshacerlo.
 */
export async function anonymizeLead(leadId: number, dbRunner: QueryRunner): Promise<AnonymizeLeadResult> {
  const leadRes = await dbRunner.query(`SELECT anonymized_at FROM leads WHERE id = $1 AND deleted_at IS NULL;`, [leadId]);
  const lead = leadRes.rows[0];
  if (!lead) return { outcome: "not_found" };
  if (lead.anonymized_at) return { outcome: "already_anonymized" };

  const anonName = `Prospecto Eliminado #${leadId}`;
  const anonEmail = `prospecto-eliminado-${leadId}@anonimizado.local`;

  // Sin `notes`: esa columna se eliminó en la migración 0005 (el campo
  // plano se reemplazó por el timeline de `lead_activities`) — un UPDATE
  // que la referenciara fallaría en runtime contra el esquema real (bug
  // real, atrapado por dataPrivacy.integration.test.ts al correr esto
  // contra Postgres de verdad, no solo tsc/eslint). No se toca
  // `lead_activities`: su `body` es texto libre escrito por el equipo, no
  // un campo estructurado de identidad, mismo criterio que
  // `anonymizeClient()` con `audit_log`.
  await dbRunner.query(
    `UPDATE leads
     SET name = $1, email = $2, phone = NULL, message = '', anonymized_at = now()
     WHERE id = $3;`,
    [anonName, anonEmail, leadId]
  );

  return { outcome: "ok" };
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

export interface SetLeadFollowUpParams {
  id: number;
  /** `null` para borrar el recordatorio (ej. ya se contactó, se cambia de
   * opinión). Formato `YYYY-MM-DD`. */
  nextFollowUpAt: string | null;
  followUpNote?: string | null;
}

/**
 * Agenda (o borra) el próximo recontacto de un lead. Reinicia
 * `follow_up_notified_at` a `NULL` en la MISMA sentencia — a diferencia de
 * `viewed_notified_at`/`overdue_notified_at`/`sla_warning_notified_at`
 * (que solo se pisan una vez, nunca por una acción del usuario), acá sí
 * hace falta: si alguien reprograma un seguimiento a una fecha nueva,
 * debe volver a avisar en esa fecha, no quedar marcado como "ya avisado"
 * para siempre por el aviso anterior (ver migración 0023).
 */
export async function setLeadFollowUp(
  { id, nextFollowUpAt, followUpNote }: SetLeadFollowUpParams,
  dbRunner: QueryRunner
) {
  const res = await dbRunner.query(
    `UPDATE leads SET next_follow_up_at = $1, follow_up_note = $2, follow_up_notified_at = NULL
     WHERE id = $3 AND deleted_at IS NULL
     RETURNING id, next_follow_up_at, follow_up_note;`,
    [nextFollowUpAt, followUpNote ?? null, id]
  );
  return res.rows[0] ?? null;
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


