import { query } from "../db";
import type { TimeEntry } from "@/components/dashboard/types";

const TIME_ENTRY_SELECT = `
  SELECT te.id, te.user_id, u.name AS user_name, te.project_id, p.title AS project_title,
         te.sprint_id, s.title AS sprint_title, te.entry_date, te.hours, te.description,
         te.billable, te.created_at
  FROM time_entries te
  JOIN users u ON u.id = te.user_id
  JOIN projects p ON p.id = te.project_id
  LEFT JOIN sprints s ON s.id = te.sprint_id
`;

function shapeTimeEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    user_name: String(row.user_name ?? ""),
    project_id: Number(row.project_id),
    project_title: String(row.project_title ?? ""),
    sprint_id: row.sprint_id ? Number(row.sprint_id) : null,
    sprint_title: row.sprint_title ? String(row.sprint_title) : null,
    entry_date: String(row.entry_date ?? ""),
    hours: Number(row.hours ?? 0),
    description: String(row.description ?? ""),
    billable: Boolean(row.billable ?? true),
    created_at: String(row.created_at ?? ""),
  };
}

/** Horas de una sola persona — lo único que ve alguien que no es admin. */
export async function getUserTimeEntries(userId: number | string): Promise<TimeEntry[]> {
  const res = await query(
    `${TIME_ENTRY_SELECT} WHERE te.user_id = $1 ORDER BY te.entry_date DESC, te.created_at DESC;`,
    [userId]
  );
  return res.rows.map(shapeTimeEntry);
}

export interface CreateTimeEntryData {
  project_id: number;
  sprint_id?: number | null;
  entry_date: string;
  hours: number;
  description?: string;
  billable?: boolean;
}

/**
 * Registra horas de un usuario contra un proyecto/sprint.
 */
export async function createTimeEntry(userId: number | string, data: CreateTimeEntryData) {
  const projectExists = await query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL;", [data.project_id]);
  if (projectExists.rows.length === 0) return null;

  await query(
    `INSERT INTO time_entries (user_id, project_id, sprint_id, entry_date, hours, description, billable)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [userId, data.project_id, data.sprint_id ?? null, data.entry_date, data.hours, data.description || "", data.billable ?? true]
  );

  return true;
}

/**
 * Elimina un registro de horas (del usuario propio o cualquiera si es admin).
 */
export async function deleteTimeEntry(id: number, userId: number | string, isAdmin: boolean) {
  const condition = isAdmin ? "id = $1" : "id = $1 AND user_id = $2";
  const params = isAdmin ? [id] : [id, userId];
  const res = await query(`DELETE FROM time_entries WHERE ${condition} RETURNING id;`, params);
  return res.rows.length > 0;
}

