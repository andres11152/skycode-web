import { query } from "../db";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/components/dashboard/types";

// Ventana de SLA por prioridad, en horas — respaldo si el caller no pasa
// `slaWindowHours` (ej. un test que no arma settings explícitamente). La
// fuente real y editable es `settings.sla_hours_*` (migración 0015,
// /dashboard/configuracion) — la ruta `POST /api/support-tickets` la lee
// con `getSettings()` y la pasa acá explícitamente en cada request.
const DEFAULT_SLA_WINDOW_HOURS: Record<TicketPriority, number> = {
  Urgente: 4,
  Alta: 24,
  Media: 72,
  Baja: 120,
};

function computeSlaDueAt(
  priority: TicketPriority,
  slaWindowHours: Record<TicketPriority, number> = DEFAULT_SLA_WINDOW_HOURS,
  from: Date = new Date()
): Date {
  return new Date(from.getTime() + slaWindowHours[priority] * 60 * 60 * 1000);
}

const TICKETS_SELECT = `
  SELECT t.id, t.project_id, p.title AS project_title, c.name AS client_name,
         t.title, t.description, t.priority, t.status, t.resolution_note,
         t.sla_due_at, t.created_at, t.resolved_at, t.closed_at,
         u.id AS assignee_id, u.name AS assignee_name, u.email AS assignee_email
  FROM support_tickets t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

function shapeTicketRow(row: Record<string, unknown>): SupportTicket {
  const assigneeId = row.assignee_id ? Number(row.assignee_id) : null;
  const assigneeName = typeof row.assignee_name === "string" ? row.assignee_name : null;
  const assigneeEmail = typeof row.assignee_email === "string" ? row.assignee_email : null;

  return {
    id: Number(row.id),
    project_id: Number(row.project_id),
    project_title: String(row.project_title ?? ""),
    client_name: String(row.client_name ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    priority: row.priority as TicketPriority,
    status: row.status as TicketStatus,
    assignee: assigneeId && assigneeName && assigneeEmail ? { id: assigneeId, name: assigneeName, email: assigneeEmail } : null,
    resolution_note: row.resolution_note ? String(row.resolution_note) : null,
    sla_due_at: String(row.sla_due_at ?? ""),
    created_at: String(row.created_at ?? ""),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
    closed_at: row.closed_at ? String(row.closed_at) : null,
  };
}

/**
 * Todos los tickets no borrados, para el tablero interno
 * (`/dashboard/soporte`) — ordenados por vencimiento de SLA ascendente
 * (lo más urgente primero), no por fecha de creación.
 */
export async function getAllTickets(): Promise<SupportTicket[]> {
  const res = await query(`${TICKETS_SELECT} WHERE t.deleted_at IS NULL ORDER BY t.sla_due_at ASC;`);
  return res.rows.map(shapeTicketRow);
}

/**
 * Tickets de TODOS los proyectos de un cliente (portal, solo lectura de
 * lo propio) — mismo criterio de dueño que `getClientProjects`. Ordenados
 * por creación descendente, no por SLA: al cliente le importa "lo que
 * abrí más recientemente", no la urgencia operativa interna.
 */
export async function getClientTickets(clientId: number | string): Promise<SupportTicket[]> {
  const res = await query(
    `${TICKETS_SELECT} WHERE t.deleted_at IS NULL AND p.client_id = $1 ORDER BY t.created_at DESC;`,
    [clientId]
  );
  return res.rows.map(shapeTicketRow);
}

/** `true` si el proyecto pertenece a ese cliente — para validar `project_id` al abrir un ticket desde /portal. */
export async function isProjectOwnedByClient(projectId: number, clientId: number | string): Promise<boolean> {
  const res = await query(`SELECT 1 FROM projects WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL;`, [
    projectId,
    clientId,
  ]);
  return res.rows.length > 0;
}

export async function getTicketById(id: number): Promise<SupportTicket | null> {
  const res = await query(`${TICKETS_SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL;`, [id]);
  const row = res.rows[0];
  return row ? shapeTicketRow(row) : null;
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateTicketData {
  project_id: number;
  title: string;
  description?: string;
  priority?: TicketPriority;
  assignee_id?: number | null;
}

export async function createTicket(
  data: CreateTicketData,
  createdBy: number | string,
  dbRunner: QueryRunner,
  slaWindowHours?: Record<TicketPriority, number>
) {
  const priority = data.priority ?? "Media";
  const slaDueAt = computeSlaDueAt(priority, slaWindowHours);

  const res = await dbRunner.query(
    `INSERT INTO support_tickets (project_id, title, description, priority, assignee_id, sla_due_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id;`,
    [data.project_id, data.title, data.description ?? "", priority, data.assignee_id ?? null, slaDueAt, createdBy]
  );
  return res.rows[0].id as number;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  assignee_id?: number | null;
  status?: TicketStatus;
  resolution_note?: string;
}

/**
 * Edita un ticket. `resolved_at`/`closed_at` se derivan del `status`
 * recibido, nunca se setean a mano — y reabrir un ticket resuelto/cerrado
 * (volver a `Abierto`/`En Progreso`) limpia ambas fechas. El SLA
 * (`sla_due_at`) **no** se recalcula acá aunque cambie la prioridad — ver
 * el comentario de la migración 0012: reprogramar el SLA es una acción
 * explícita que no existe todavía, no un efecto secundario de este update.
 */
export async function updateTicket(id: number, data: UpdateTicketData, dbRunner: QueryRunner) {
  const before = await dbRunner.query("SELECT * FROM support_tickets WHERE id = $1 AND deleted_at IS NULL;", [id]);
  if (before.rows.length === 0) return null;

  const resolvedAtExpr =
    data.status === undefined
      ? "resolved_at"
      : data.status === "Resuelto" || data.status === "Cerrado"
      ? "COALESCE(resolved_at, now())"
      : "NULL";
  const closedAtExpr =
    data.status === undefined ? "closed_at" : data.status === "Cerrado" ? "COALESCE(closed_at, now())" : "NULL";

  const res = await dbRunner.query(
    `UPDATE support_tickets
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority),
         assignee_id = CASE WHEN $4::boolean THEN $5::integer ELSE assignee_id END,
         status = COALESCE($6, status),
         resolution_note = COALESCE($7, resolution_note),
         resolved_at = ${resolvedAtExpr},
         closed_at = ${closedAtExpr}
     WHERE id = $8
     RETURNING *;`,
    [
      data.title,
      data.description,
      data.priority,
      "assignee_id" in data,
      data.assignee_id ?? null,
      data.status,
      data.resolution_note,
      id,
    ]
  );

  return { before: before.rows[0], after: res.rows[0] };
}
