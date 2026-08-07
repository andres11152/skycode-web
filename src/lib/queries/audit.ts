import { query } from "../db";

export interface AuditLogEntry {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: unknown;
  ip: string | null;
  created_at: string;
}

export interface GetAuditLogsParams {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

/**
 * Consulta la bitácora de auditoría con filtros opcionales por tipo de entidad, ID y límite.
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

  return res.rows.map((row) => ({
    id: Number(row.id),
    actor_id: row.actor_id ? Number(row.actor_id) : null,
    actor_email: row.actor_email ? String(row.actor_email) : null,
    action: String(row.action ?? ""),
    entity_type: String(row.entity_type ?? ""),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    diff: row.diff,
    ip: row.ip ? String(row.ip) : null,
    created_at: String(row.created_at ?? ""),
  }));
}
