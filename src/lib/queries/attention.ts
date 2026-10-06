import { query } from "../db";
import { todayBogota } from "../dateOnly";
import { hasPermission } from "../rbac";

/**
 * "Requiere tu atención": lo accionable de HOY para quien entra al panel, en
 * vez de un mapa de contadores. Cada categoría respeta el permiso del rol (un
 * traffiker no ve facturas) y trae solo las 3 más urgentes + el total, con un
 * enlace al módulo donde se resuelve. Una sola ronda de consultas pequeñas,
 * en paralelo; ninguna toca montos sin convertir (solo cuenta y nombra).
 */
export type AttentionTone = "danger" | "warning" | "info";

export interface AttentionRow {
  id: number | string;
  title: string;
  detail: string;
  href: string;
}

export interface AttentionGroup {
  key: "invoices" | "tickets" | "followUps" | "proposals" | "tasks";
  title: string;
  tone: AttentionTone;
  total: number;
  href: string;
  rows: AttentionRow[];
}

interface Row {
  id: number | string;
  title: string;
  detail: string;
  total: string;
}

async function run(sql: string, params: unknown[], hrefFor: (id: number | string) => string): Promise<{ total: number; rows: AttentionRow[] }> {
  // Sin catch a propósito: es una página dinámica del panel, y un fallo de la base
  // debe llegar a `error.tsx` (con su botón de reintentar), no mostrar "todo al día".
  const res = await query(sql, params);
  const rows = res.rows as Row[];
  return {
    total: rows.length ? Number(rows[0].total) : 0,
    rows: rows.map((r) => ({ id: r.id, title: String(r.title), detail: String(r.detail), href: hrefFor(r.id) })),
  };
}

export async function getAttentionGroups(userId: number | string, role: string): Promise<AttentionGroup[]> {
  const today = todayBogota();
  const jobs: Promise<AttentionGroup | null>[] = [];

  const push = (
    allowed: boolean,
    group: Omit<AttentionGroup, "total" | "rows">,
    sql: string,
    params: unknown[],
    hrefFor: (id: number | string) => string = () => group.href,
  ) => {
    if (!allowed) return;
    jobs.push(
      run(sql, params, hrefFor).then((r) => (r.total > 0 ? { ...group, total: r.total, rows: r.rows } : null)),
    );
  };

  push(
    hasPermission(role, "invoices:read"),
    { key: "invoices", title: "Facturas vencidas", tone: "danger", href: "/dashboard/facturacion" },
    `
    WITH overdue AS (
      SELECT i.id, i.description, i.due_date::text AS due_date, p.title AS project
      FROM invoices i
      JOIN projects p ON p.id = i.project_id
      LEFT JOIN payments pay ON pay.invoice_id = i.id
      WHERE i.deleted_at IS NULL AND i.due_date < $1::date
      GROUP BY i.id, p.title
      HAVING i.amount - COALESCE(SUM(pay.amount), 0) > 0
    )
    SELECT id, project AS title, description || ' · venció ' || due_date AS detail, COUNT(*) OVER () AS total
    FROM overdue ORDER BY due_date ASC LIMIT 3`,
    [today],
  );

  push(
    hasPermission(role, "support:read"),
    { key: "tickets", title: "Tickets con SLA en riesgo", tone: "danger", href: "/dashboard/soporte" },
    `
    SELECT t.id, t.title, t.priority || ' · ' ||
           CASE WHEN t.sla_due_at < now() THEN 'SLA vencido' ELSE 'vence en menos de 4 h' END AS detail,
           COUNT(*) OVER () AS total
    FROM support_tickets t
    WHERE t.deleted_at IS NULL AND t.status NOT IN ('Resuelto', 'Cerrado')
      AND t.sla_due_at < now() + interval '4 hours'
    ORDER BY t.sla_due_at ASC LIMIT 3`,
    [],
  );

  push(
    hasPermission(role, "leads:read"),
    { key: "followUps", title: "Seguimientos de leads para hoy", tone: "warning", href: "/dashboard/leads" },
    `
    SELECT l.id, l.name AS title,
           COALESCE(NULLIF(l.follow_up_note, ''), l.service, 'Sin nota') || ' · ' || l.next_follow_up_at::text AS detail,
           COUNT(*) OVER () AS total
    FROM leads l
    WHERE l.deleted_at IS NULL AND l.anonymized_at IS NULL AND l.status NOT IN ('Ganado', 'Perdido')
      AND l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at <= $1::date
    ORDER BY l.next_follow_up_at ASC LIMIT 3`,
    [today],
  );

  push(
    hasPermission(role, "proposals:read"),
    { key: "proposals", title: "Propuestas sin respuesta hace más de 7 días", tone: "warning", href: "/dashboard/propuestas" },
    `
    SELECT p.id::text AS id, p.title, p.client_name || ' · enviada ' || p.created_at::date::text AS detail,
           COUNT(*) OVER () AS total
    FROM proposals p
    WHERE p.accepted_at IS NULL AND p.rejected_at IS NULL
      AND p.created_at < now() - interval '7 days'
      AND (p.valid_until IS NULL OR p.valid_until >= $1::date)
    ORDER BY p.created_at ASC LIMIT 3`,
    [today],
  );

  push(
    hasPermission(role, "tasks:read"),
    { key: "tasks", title: "Tus tareas que vencen hoy o ya vencieron", tone: "info", href: "/dashboard/mis-tareas" },
    `
    SELECT t.id, t.title, pr.title || ' · ' || t.due_date::text AS detail, COUNT(*) OVER () AS total
    FROM tasks t
    JOIN projects pr ON pr.id = t.project_id AND pr.deleted_at IS NULL
    WHERE t.deleted_at IS NULL AND t.assignee_id = $1 AND t.status <> 'Completada'
      AND t.due_date IS NOT NULL AND t.due_date <= $2::date
    ORDER BY t.due_date ASC LIMIT 3`,
    [userId, today],
  );

  const groups = await Promise.all(jobs);
  return groups.filter((g): g is AttentionGroup => g !== null);
}
