import { query } from "../db";
import type { TeamCapacity } from "@/components/dashboard/types";

/**
 * Carga de cada miembro activo del equipo interno: tareas abiertas (y sus
 * horas estimadas), tickets de soporte abiertos, y horas ya registradas
 * en la semana en curso — cruzando `tasks`, `support_tickets` y
 * `time_entries` sin migración nueva, son tablas que ya existen.
 *
 * Tres CTEs agregadas por separado y unidas por `user_id`, no un JOIN
 * directo de las tres tablas: unirlas de una haría fan-out (cada tarea ×
 * cada entrada de horas × cada ticket de la misma persona), inflando las
 * sumas. Agregar primero, unir después.
 *
 * `date_trunc('week', CURRENT_DATE)` en Postgres arranca en lunes (ISO) —
 * "esta semana" es lunes a hoy, no una ventana de 7 días corrida.
 */
export async function getTeamCapacity(): Promise<TeamCapacity[]> {
  const res = await query(`
    WITH task_agg AS (
      SELECT assignee_id AS user_id,
             COUNT(*) FILTER (WHERE status != 'Completada') AS open_tasks_count,
             COALESCE(SUM(estimated_hours) FILTER (WHERE status != 'Completada'), 0) AS open_estimated_hours
      FROM tasks
      WHERE deleted_at IS NULL AND assignee_id IS NOT NULL
      GROUP BY assignee_id
    ),
    ticket_agg AS (
      SELECT assignee_id AS user_id,
             COUNT(*) FILTER (WHERE status IN ('Abierto', 'En Progreso')) AS open_tickets_count
      FROM support_tickets
      WHERE deleted_at IS NULL AND assignee_id IS NOT NULL
      GROUP BY assignee_id
    ),
    hours_agg AS (
      SELECT user_id, COALESCE(SUM(hours), 0) AS hours_this_week
      FROM time_entries
      WHERE entry_date >= date_trunc('week', CURRENT_DATE)
      GROUP BY user_id
    )
    SELECT u.id, u.name, u.email, u.role, u.weekly_hours_capacity,
           COALESCE(task_agg.open_tasks_count, 0) AS open_tasks_count,
           COALESCE(task_agg.open_estimated_hours, 0) AS open_estimated_hours,
           COALESCE(ticket_agg.open_tickets_count, 0) AS open_tickets_count,
           COALESCE(hours_agg.hours_this_week, 0) AS hours_this_week
    FROM users u
    LEFT JOIN task_agg ON task_agg.user_id = u.id
    LEFT JOIN ticket_agg ON ticket_agg.user_id = u.id
    LEFT JOIN hours_agg ON hours_agg.user_id = u.id
    WHERE u.role != 'client' AND u.status = 'active'
    ORDER BY open_estimated_hours DESC, u.name ASC;
  `);

  return res.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? ""),
    open_tasks_count: Number(row.open_tasks_count),
    open_estimated_hours: Number(row.open_estimated_hours),
    open_tickets_count: Number(row.open_tickets_count),
    hours_this_week: Number(row.hours_this_week),
    weekly_hours_capacity: Number(row.weekly_hours_capacity),
  }));
}
