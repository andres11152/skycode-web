import { query } from "../db";
import type { SprintComment } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

/**
 * Confirma que el sprint exista y pertenezca a un proyecto del cliente
 * dado — mismo criterio de "no confirmar que existe si no es tuyo" que
 * `isProjectOwnedByClient()` en supportTickets.ts, replicado acá en vez
 * de reutilizado porque la comprobación parte de un `sprintId`, no de un
 * `projectId` directo.
 */
export async function isSprintOwnedByClient(sprintId: number, clientId: number | string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM sprints s JOIN projects p ON p.id = s.project_id WHERE s.id = $1 AND p.client_id = $2;`,
    [sprintId, clientId]
  );
  return res.rows.length > 0;
}

export async function sprintExists(sprintId: number): Promise<boolean> {
  const res = await query(`SELECT 1 FROM sprints WHERE id = $1;`, [sprintId]);
  return res.rows.length > 0;
}

export async function getSprintComments(sprintId: number): Promise<SprintComment[]> {
  const res = await query(
    `SELECT c.id, c.body, c.created_at, u.id AS author_id, u.name AS author_name, u.role AS author_role
     FROM sprint_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.sprint_id = $1
     ORDER BY c.created_at ASC;`,
    [sprintId]
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    body: String(row.body),
    created_at: String(row.created_at),
    author: row.author_id ? { id: Number(row.author_id), name: String(row.author_name), role: String(row.author_role) } : null,
  }));
}

export async function createSprintComment(
  sprintId: number,
  authorId: number | string,
  body: string,
  dbRunner: QueryRunner
): Promise<number> {
  const res = await dbRunner.query(
    `INSERT INTO sprint_comments (sprint_id, author_id, body) VALUES ($1, $2, $3) RETURNING id;`,
    [sprintId, authorId, body]
  );
  return Number(res.rows[0].id);
}
