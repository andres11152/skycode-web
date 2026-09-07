import { query } from "../db";
import type { Task, TaskStatus } from "@/components/dashboard/types";

const TASKS_SELECT = `
  SELECT t.id, t.project_id, t.sprint_id, s.title AS sprint_title, t.title, t.description,
         t.status, t.estimated_hours, t.due_date, t.created_at, t.completed_at,
         u.id AS assignee_id, u.name AS assignee_name, u.email AS assignee_email,
         COALESCE(te.actual_hours, 0) AS actual_hours
  FROM tasks t
  LEFT JOIN sprints s ON s.id = t.sprint_id
  LEFT JOIN users u ON u.id = t.assignee_id
  LEFT JOIN (
    SELECT task_id, SUM(hours) AS actual_hours FROM time_entries WHERE task_id IS NOT NULL GROUP BY task_id
  ) te ON te.task_id = t.id
`;

function shapeTaskRow(row: Record<string, unknown>): Task {
  const assigneeId = row.assignee_id ? Number(row.assignee_id) : null;
  const assigneeName = typeof row.assignee_name === "string" ? row.assignee_name : null;
  const assigneeEmail = typeof row.assignee_email === "string" ? row.assignee_email : null;

  return {
    id: Number(row.id),
    project_id: Number(row.project_id),
    sprint_id: row.sprint_id ? Number(row.sprint_id) : null,
    sprint_title: row.sprint_title ? String(row.sprint_title) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    assignee: assigneeId && assigneeName && assigneeEmail ? { id: assigneeId, name: assigneeName, email: assigneeEmail } : null,
    status: row.status as TaskStatus,
    estimated_hours: row.estimated_hours !== null ? Number(row.estimated_hours) : null,
    actual_hours: Number(row.actual_hours ?? 0),
    due_date: row.due_date ? String(row.due_date) : null,
    created_at: String(row.created_at ?? ""),
    completed_at: row.completed_at ? String(row.completed_at) : null,
  };
}

/**
 * Tareas de un proyecto, con el sprint (si tiene), el responsable y las
 * horas reales ya sumadas desde `time_entries` — para comparar
 * `estimated_hours` contra `actual_hours` sin una segunda consulta.
 */
export async function getProjectTasks(projectId: number): Promise<Task[]> {
  const res = await query(
    `${TASKS_SELECT} WHERE t.project_id = $1 AND t.deleted_at IS NULL ORDER BY t.created_at ASC;`,
    [projectId]
  );
  return res.rows.map(shapeTaskRow);
}

export async function getTaskById(id: number): Promise<Task | null> {
  const res = await query(`${TASKS_SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL;`, [id]);
  const row = res.rows[0];
  return row ? shapeTaskRow(row) : null;
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateTaskData {
  project_id: number;
  sprint_id?: number | null;
  title: string;
  description?: string;
  assignee_id?: number | null;
  estimated_hours?: number | null;
  due_date?: string | null;
}

export async function createTask(data: CreateTaskData, createdBy: number | string, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `INSERT INTO tasks (project_id, sprint_id, title, description, assignee_id, estimated_hours, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id;`,
    [
      data.project_id,
      data.sprint_id ?? null,
      data.title,
      data.description ?? "",
      data.assignee_id ?? null,
      data.estimated_hours ?? null,
      data.due_date ?? null,
      createdBy,
    ]
  );
  return res.rows[0].id as number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  sprint_id?: number | null;
  assignee_id?: number | null;
  status?: TaskStatus;
  estimated_hours?: number | null;
  due_date?: string | null;
}

/**
 * Edición completa (título, descripción, sprint, responsable, estado,
 * estimado, fecha) — requiere `tasks:write`. `completed_at` se pone/quita
 * solo en función del `status` recibido, nunca se setea a mano.
 */
export async function updateTask(id: number, data: UpdateTaskData, dbRunner: QueryRunner) {
  const before = await dbRunner.query("SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL;", [id]);
  if (before.rows.length === 0) return null;

  const completedAtExpr =
    data.status === undefined
      ? "completed_at"
      : data.status === "Completada"
      ? "COALESCE(completed_at, now())"
      : "NULL";

  const res = await dbRunner.query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         sprint_id = CASE WHEN $3::boolean THEN $4::integer ELSE sprint_id END,
         assignee_id = CASE WHEN $5::boolean THEN $6::integer ELSE assignee_id END,
         status = COALESCE($7, status),
         estimated_hours = CASE WHEN $8::boolean THEN $9::numeric ELSE estimated_hours END,
         due_date = CASE WHEN $10::boolean THEN $11::date ELSE due_date END,
         completed_at = ${completedAtExpr}
     WHERE id = $12
     RETURNING *;`,
    [
      data.title,
      data.description,
      "sprint_id" in data,
      data.sprint_id ?? null,
      "assignee_id" in data,
      data.assignee_id ?? null,
      data.status,
      "estimated_hours" in data,
      data.estimated_hours ?? null,
      "due_date" in data,
      data.due_date ?? null,
      id,
    ]
  );

  return { before: before.rows[0], after: res.rows[0] };
}

/**
 * Cambia solo el estado de una tarea — la vía de autogestión: cualquier
 * usuario interno puede llamar esto sobre una tarea que tiene asignada a
 * sí mismo, sin necesitar `tasks:write` (mismo criterio que registrar
 * horas propias). El `WHERE assignee_id = $3` es la única barrera; si no
 * calza, no actualiza nada y el caller interpreta null como "no autorizado
 * o no existe" sin distinguir cuál (mismo patrón que revokeOwnSession).
 */
export async function updateOwnTaskStatus(id: number, status: TaskStatus, userId: number | string) {
  const completedAtExpr = status === "Completada" ? "COALESCE(completed_at, now())" : "NULL";
  const res = await query(
    `UPDATE tasks SET status = $1, completed_at = ${completedAtExpr}
     WHERE id = $2 AND assignee_id = $3 AND deleted_at IS NULL
     RETURNING *;`,
    [status, id, userId]
  );
  return res.rows[0] ?? null;
}

export async function softDeleteTask(id: number, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `UPDATE tasks SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *;`,
    [id]
  );
  return res.rows[0] ?? null;
}
