import { query } from "../db";
import { createOnboardingChecklist } from "./onboarding";
import type { Project, ProjectOption } from "@/components/dashboard/types";

const PROJECTS_WITH_CLIENT_SELECT = `
  SELECT p.id, p.title, p.description, p.progress, p.repo_url, p.staging_url,
         p.sla_warranty_start, p.sla_warranty_end, p.status, p.created_at,
         c.id AS client_id, c.name AS client_name, c.email AS client_email
  FROM projects p
  JOIN clients c ON c.id = p.client_id
`;

function shapeProjectRow(row: Record<string, unknown>): Omit<Project, "sprints"> {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    progress: Number(row.progress ?? 0),
    repo_url: row.repo_url ? String(row.repo_url) : undefined,
    staging_url: row.staging_url ? String(row.staging_url) : undefined,
    sla_warranty_start: row.sla_warranty_start ? String(row.sla_warranty_start) : undefined,
    sla_warranty_end: row.sla_warranty_end ? String(row.sla_warranty_end) : undefined,
    status: row.status as Project["status"],
    created_at: String(row.created_at ?? ""),
    client: {
      id: Number(row.client_id),
      name: String(row.client_name ?? ""),
      email: String(row.client_email ?? ""),
    },
  };
}

async function withSprints(rows: Record<string, unknown>[]): Promise<Project[]> {
  const projects: Project[] = [];
  for (const row of rows) {
    const sprintsRes = await query(
      `SELECT id, title, status, progress, approval_status, approval_comment, approved_at
       FROM sprints WHERE project_id = $1 ORDER BY id ASC;`,
      [row.id]
    );
    const sprints = sprintsRes.rows.map((s) => ({
      id: Number(s.id),
      title: String(s.title ?? ""),
      status: s.status as Project["sprints"][number]["status"],
      progress: Number(s.progress ?? 0),
      approval_status: (s.approval_status as Project["sprints"][number]["approval_status"]) ?? null,
      approval_comment: s.approval_comment ? String(s.approval_comment) : null,
      approved_at: s.approved_at ? String(s.approved_at) : null,
    }));

    projects.push({ ...shapeProjectRow(row), sprints });
  }
  return projects;
}

/**
 * Todos los proyectos activos, con su cliente y sprints. Para
 * admin/sales_manager — quien llama esto ya debe haber verificado el
 * permiso `projects:read`.
 */
export async function getAllActiveProjects(): Promise<Project[]> {
  const res = await query(`${PROJECTS_WITH_CLIENT_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC;`);
  return withSprints(res.rows);
}

/**
 * Lista liviana (id, título, cliente) para selectores — ej. "abrir ticket
 * contra qué proyecto" en /dashboard/soporte. A propósito no reutiliza
 * `getAllActiveProjects()`: esa trae sprints por cada proyecto (N+1), algo
 * innecesario para poblar un `<select>`.
 */
export async function getProjectOptions(): Promise<ProjectOption[]> {
  const res = await query(
    `SELECT p.id, p.title, c.name AS client_name
     FROM projects p JOIN clients c ON c.id = p.client_id
     WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC;`
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? ""),
    client_name: String(row.client_name ?? ""),
  }));
}

/**
 * Un proyecto puntual con su cliente y sprints — para la página de
 * detalle (`/dashboard/proyectos/[id]`). `null` si no existe o está
 * borrado, indistinguible a propósito (mismo criterio que el resto de
 * `getXById` del proyecto).
 */
export async function getProjectById(id: number): Promise<Project | null> {
  const res = await query(`${PROJECTS_WITH_CLIENT_SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL;`, [id]);
  const row = res.rows[0];
  if (!row) return null;
  const [project] = await withSprints([row]);
  return project;
}

/**
 * Solo los proyectos de un cliente puntual (portal). `clientId` viene de
 * `session.clientId`, nunca de un email — ver lib/session.ts.
 */
export async function getClientProjects(clientId: number | string): Promise<Project[]> {
  const res = await query(
    `${PROJECTS_WITH_CLIENT_SELECT} WHERE p.client_id = $1 AND p.deleted_at IS NULL ORDER BY p.created_at DESC;`,
    [clientId]
  );
  return withSprints(res.rows);
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateProjectSprintData {
  title: string;
  status?: string;
  progress?: number;
}

export interface CreateProjectData {
  client_email: string;
  client_name: string;
  title: string;
  description?: string;
  repo_url?: string;
  staging_url?: string;
  sprints?: CreateProjectSprintData[];
}

/**
 * Crea un proyecto vinculándolo a un cliente existente o creando uno nuevo si no existe.
 */
export async function createProjectWithClient(data: CreateProjectData, dbRunner: QueryRunner) {
  const clientEmailNormalized = data.client_email.toLowerCase();
  const insertClientRes = await dbRunner.query(
    `INSERT INTO clients (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id;`,
    [data.client_name, clientEmailNormalized]
  );
  const clientId =
    insertClientRes.rows[0]?.id ??
    (await dbRunner.query(`SELECT id FROM clients WHERE email = $1;`, [clientEmailNormalized])).rows[0].id;

  const projectRes = await dbRunner.query(
    `INSERT INTO projects (client_id, title, description, progress, repo_url, staging_url, status)
     VALUES ($1, $2, $3, 0, $4, $5, 'En Desarrollo')
     RETURNING *;`,
    [clientId, data.title, data.description || "", data.repo_url || "", data.staging_url || ""]
  );
  const project = projectRes.rows[0];

  await createOnboardingChecklist(project.id, dbRunner);

  if (data.sprints && Array.isArray(data.sprints)) {
    for (const sprint of data.sprints) {
      await dbRunner.query(
        `INSERT INTO sprints (project_id, title, status, progress) VALUES ($1, $2, $3, $4);`,
        [project.id, sprint.title, sprint.status || "Pendiente", sprint.progress || 0]
      );
    }
  }

  return { ...project, client: { id: clientId, name: data.client_name, email: clientEmailNormalized } };
}

export interface UpdateProjectData {
  progress?: number;
  status?: string;
  repo_url?: string;
  staging_url?: string;
  sla_warranty_start?: string;
  sla_warranty_end?: string;
}

/**
 * Actualiza progreso, estado u URLs de un proyecto.
 */
export async function updateProject(id: number, data: UpdateProjectData, dbRunner: QueryRunner) {
  const before = await dbRunner.query("SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL;", [id]);
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE projects
     SET progress = COALESCE($1, progress),
         status = COALESCE($2, status),
         repo_url = COALESCE($3, repo_url),
         staging_url = COALESCE($4, staging_url),
         sla_warranty_start = COALESCE($5, sla_warranty_start),
         sla_warranty_end = COALESCE($6, sla_warranty_end)
     WHERE id = $7
     RETURNING *;`,
    [data.progress, data.status, data.repo_url, data.staging_url, data.sla_warranty_start, data.sla_warranty_end, id]
  );

  return { before: before.rows[0], after: res.rows[0] };
}

/**
 * Borrado lógico de un proyecto.
 */
export async function softDeleteProject(id: number, dbRunner: QueryRunner) {
  const res = await dbRunner.query(
    `UPDATE projects SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *;`,
    [id]
  );
  return res.rows[0] ?? null;
}

export type SprintApprovalResult =
  | { outcome: "ok"; sprint: Record<string, unknown> }
  | { outcome: "not_found" }
  | { outcome: "not_owner" }
  | { outcome: "not_completed" }
  | { outcome: "already_decided" };

/**
 * Aprueba o rechaza un sprint como cliente — el único camino de escritura
 * que existe hoy sobre `sprints` (se crean una sola vez y nunca se editan
 * desde ninguna interfaz interna). Encadena las validaciones de negocio
 * en el orden que más información le da al caller sobre qué falló:
 * primero si el sprint existe, después si pertenece al cliente que llama
 * (nunca reveles "no pertenece" como "no existe" — pero acá ambos dan 404
 * de todos modos en la ruta, por no filtrar qué sprints ajenos existen),
 * después si ya está en un estado aprobable, y por último si ya se decidió.
 */
export async function approveSprint(
  sprintId: number,
  clientId: number | string,
  data: { status: "aprobado" | "rechazado"; comment?: string },
  approvedByUserId: number | string,
  dbRunner: QueryRunner
): Promise<SprintApprovalResult> {
  const res = await dbRunner.query(
    `SELECT s.id, s.status, s.approval_status, p.client_id
     FROM sprints s JOIN projects p ON p.id = s.project_id
     WHERE s.id = $1;`,
    [sprintId]
  );
  const row = res.rows[0];
  if (!row) return { outcome: "not_found" };
  if (String(row.client_id) !== String(clientId)) return { outcome: "not_owner" };
  if (row.status !== "Completado") return { outcome: "not_completed" };
  if (row.approval_status !== null) return { outcome: "already_decided" };

  const updateRes = await dbRunner.query(
    `UPDATE sprints
     SET approval_status = $1, approval_comment = $2, approved_at = now(), approved_by = $3
     WHERE id = $4
     RETURNING *;`,
    [data.status, data.comment ?? null, approvedByUserId, sprintId]
  );

  return { outcome: "ok", sprint: updateRes.rows[0] };
}

