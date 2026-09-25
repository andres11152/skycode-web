import { query } from "../db";

export type ClientActivityType =
  | "document"
  | "invoice"
  | "payment"
  | "ticket_created"
  | "ticket_resolved"
  | "sprint_approval"
  | "sprint_comment";

export interface ClientActivityEvent {
  type: ClientActivityType;
  id: number;
  createdAt: string;
  projectId: number;
  projectTitle: string;
  label: string;
  amount: number | null;
  currency: "COP" | "USD" | null;
  status: string | null;
}

function shapeActivityRow(row: Record<string, unknown>): ClientActivityEvent {
  return {
    type: String(row.type) as ClientActivityType,
    id: Number(row.id),
    createdAt: String(row.created_at ?? ""),
    projectId: Number(row.project_id),
    projectTitle: String(row.project_title ?? ""),
    label: String(row.label ?? ""),
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    currency: row.currency ? (String(row.currency) as "COP" | "USD") : null,
    status: row.status ? String(row.status) : null,
  };
}

/**
 * Bitácora de actividad reciente para `/portal` — un vistazo cronológico
 * de "qué pasó" en los proyectos del cliente, sin exponer nada interno
 * (a diferencia de `audit_log`, que mezcla acciones de todo el sistema,
 * incluidas las que no le competen a un cliente ver — ej. quién inició
 * sesión, o que alguien fue anonimizado). Se arma con un UNION ALL sobre
 * las tablas que ya existen (documentos, facturas, pagos, tickets,
 * aprobaciones de sprint, comentarios), cada rama proyectada al mismo
 * shape (`type`/`id`/`created_at`/`label`/`amount`/`currency`/`status`)
 * para poder ordenar todo junto por fecha — no hay una tabla propia de
 * "eventos", esto es 100% derivado.
 *
 * Los comentarios del propio cliente se excluyen a propósito (`NOT
 * EXISTS` sobre `users` con `role='client'` y su mismo `client_id`): ya
 * sabe lo que escribió, mostrárselo de vuelta como "actividad" sería
 * ruido — el feed le interesa sobre todo para enterarse de lo que hizo
 * el equipo.
 */
export async function getClientActivityFeed(clientId: number | string, limit = 30): Promise<ClientActivityEvent[]> {
  const res = await query(
    `
    (SELECT 'document' AS type, d.id, d.created_at, d.project_id, p.title AS project_title,
            d.original_filename AS label, NULL::numeric AS amount, NULL::varchar AS currency, NULL::varchar AS status
     FROM documents d JOIN projects p ON p.id = d.project_id
     WHERE p.client_id = $1 AND d.deleted_at IS NULL)

    UNION ALL

    (SELECT 'invoice', i.id, i.created_at, i.project_id, p.title,
            COALESCE(i.invoice_number, 'INV-' || i.id), i.amount, i.currency, NULL
     FROM invoices i JOIN projects p ON p.id = i.project_id
     WHERE p.client_id = $1 AND i.deleted_at IS NULL)

    UNION ALL

    (SELECT 'payment', pay.id, pay.created_at, i.project_id, p.title,
            COALESCE(i.invoice_number, 'INV-' || i.id), pay.amount, i.currency, NULL
     FROM payments pay
     JOIN invoices i ON i.id = pay.invoice_id
     JOIN projects p ON p.id = i.project_id
     WHERE p.client_id = $1 AND i.deleted_at IS NULL)

    UNION ALL

    (SELECT 'ticket_created', t.id, t.created_at, t.project_id, p.title,
            t.title, NULL, NULL, t.priority
     FROM support_tickets t JOIN projects p ON p.id = t.project_id
     WHERE p.client_id = $1 AND t.deleted_at IS NULL)

    UNION ALL

    (SELECT 'ticket_resolved', t.id, t.resolved_at, t.project_id, p.title,
            t.title, NULL, NULL, NULL
     FROM support_tickets t JOIN projects p ON p.id = t.project_id
     WHERE p.client_id = $1 AND t.deleted_at IS NULL AND t.resolved_at IS NOT NULL)

    UNION ALL

    (SELECT 'sprint_approval', s.id, s.approved_at, s.project_id, p.title,
            s.title, NULL, NULL, s.approval_status
     FROM sprints s JOIN projects p ON p.id = s.project_id
     WHERE p.client_id = $1 AND s.approved_at IS NOT NULL)

    UNION ALL

    (SELECT 'sprint_comment', c.id, c.created_at, s.project_id, p.title,
            s.title, NULL, NULL, NULL
     FROM sprint_comments c
     JOIN sprints s ON s.id = c.sprint_id
     JOIN projects p ON p.id = s.project_id
     WHERE p.client_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM users u WHERE u.id = c.author_id AND u.role = 'client' AND u.client_id = $1
       ))

    ORDER BY created_at DESC
    LIMIT $2;
    `,
    [clientId, limit]
  );

  return res.rows.map(shapeActivityRow);
}
