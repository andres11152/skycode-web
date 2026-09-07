import { query } from "../db";
import type { AuditLogEntry } from "@/components/dashboard/types";

export interface GetAuditLogsParams {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

/**
 * Consulta la bitácora de auditoría con filtros opcionales por tipo de entidad, ID y límite.
 * Sin paginar — usada por integraciones/tests que necesitan las últimas N
 * entradas de una entidad puntual. Para la vista de auditoría del panel,
 * ver `getAuditLogPage` abajo.
 */
export async function getAuditLogEntries({
  entityType,
  entityId,
  limit = 50,
}: GetAuditLogsParams): Promise<AuditLogEntry[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    conditions.push(`entity_id = $${params.length}`);
  }
  params.push(limit);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const res = await query(
    `SELECT id, actor_id, actor_email, action, entity_type, entity_id, diff, ip, created_at
     FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${params.length};`,
    params
  );

  return res.rows.map(shapeAuditRow);
}

function shapeAuditRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: Number(row.id),
    actor_id: row.actor_id ? Number(row.actor_id) : null,
    actor_email: row.actor_email ? String(row.actor_email) : null,
    action: String(row.action ?? ""),
    entity_type: String(row.entity_type ?? ""),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    diff: row.diff,
    ip: row.ip ? String(row.ip) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export interface AuditLogPageParams {
  q: string;
  action: string; // "ALL" o un valor de `action` exacto
  page: number;
  pageSize: number;
}

export interface AuditLogPageResult {
  entries: AuditLogEntry[];
  total: number;
  actions: string[];
}

/**
 * Página de la bitácora para /dashboard/auditoria: búsqueda libre sobre
 * actor/entidad, filtro por tipo de acción, paginada en SQL — mismo patrón
 * que `getActiveLeadsPage`. `actions` trae el catálogo real de valores
 * distintos de `action` ya usados, para poblar el filtro sin hardcodear
 * una lista que se desincroniza del código (cada `logAudit()` nuevo usa
 * su propio string de acción libre, ver lib/audit.ts).
 */
export async function getAuditLogPage({ q, action, page, pageSize }: AuditLogPageParams): Promise<AuditLogPageResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(actor_email ILIKE $${idx} OR entity_type ILIKE $${idx} OR entity_id ILIKE $${idx})`);
  }
  if (action !== "ALL") {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(pageSize);
  const limitIdx = params.length;
  params.push((page - 1) * pageSize);
  const offsetIdx = params.length;

  const [entriesRes, actionsRes] = await Promise.all([
    query(
      `SELECT id, actor_id, actor_email, action, entity_type, entity_id, diff, ip, created_at,
              COUNT(*) OVER() AS total_count
       FROM audit_log ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
      params
    ),
    query(`SELECT DISTINCT action FROM audit_log ORDER BY action ASC;`),
  ]);

  const total = entriesRes.rows[0] ? Number(entriesRes.rows[0].total_count) : 0;
  return {
    entries: entriesRes.rows.map(shapeAuditRow),
    total,
    actions: actionsRes.rows.map((r) => String(r.action)),
  };
}
