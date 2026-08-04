import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { query } from "@/lib/db";
import { initAuthDatabase } from "@/lib/auth";
import { verifySessionToken } from "@/lib/session";

const ProjectStatusSchema = z.enum(["Planificación", "En Desarrollo", "Fase QA", "Entregado", "Garantía SLA"]);
const SprintStatusSchema = z.enum(["Completado", "En Progreso", "Pendiente"]);

const CreateProjectSchema = z.object({
  client_email: z.email().trim().max(254),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  repo_url: z.url().max(255).optional().or(z.literal("")),
  staging_url: z.url().max(255).optional().or(z.literal("")),
  sprints: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        status: SprintStatusSchema.optional(),
        progress: z.number().int().min(0).max(100).optional(),
      })
    )
    .optional(),
});

const UpdateProjectSchema = z.object({
  id: z.number().int().positive(),
  progress: z.number().int().min(0).max(100).optional(),
  status: ProjectStatusSchema.optional(),
  repo_url: z.url().max(255).optional().or(z.literal("")),
  staging_url: z.url().max(255).optional().or(z.literal("")),
  sla_warranty_start: z.string().trim().max(30).optional(),
  sla_warranty_end: z.string().trim().max(30).optional(),
});

/**
 * GET /api/projects - Obtiene los proyectos del cliente o todos los proyectos si es Admin.
 */
export async function GET() {
  try {
    await initAuthDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida o expirada." }, { status: 401 });
    }

    let projectsRes;
    if (session.role === "admin") {
      // Admin ve todos los proyectos
      projectsRes = await query(
        `SELECT id, client_email, title, description, progress, repo_url, staging_url, sla_warranty_start, sla_warranty_end, status, created_at 
         FROM projects ORDER BY created_at DESC;`
      );
    } else {
      // Cliente ve solo sus proyectos
      projectsRes = await query(
        `SELECT id, client_email, title, description, progress, repo_url, staging_url, sla_warranty_start, sla_warranty_end, status, created_at 
         FROM projects WHERE client_email = $1 ORDER BY created_at DESC;`,
        [session.email]
      );
    }

    // Obtener los sprints para cada proyecto
    const projects = [];
    for (const project of projectsRes.rows) {
      const sprintsRes = await query(
        `SELECT id, title, status, progress FROM sprints WHERE project_id = $1 ORDER BY id ASC;`,
        [project.id]
      );
      projects.push({
        ...project,
        sprints: sprintsRes.rows,
      });
    }

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("❌ [API GET Projects Error]", error);
    return NextResponse.json({ error: "Error de servidor al obtener proyectos." }, { status: 500 });
  }
}

/**
 * POST /api/projects - Crea un nuevo proyecto (Solo Administradores).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    const parsed = CreateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "El correo del cliente y el título son requeridos." }, { status: 400 });
    }
    const { client_email, title, description, repo_url, staging_url, sprints } = parsed.data;

    // Insertar proyecto
    const projectRes = await query(
      `INSERT INTO projects (client_email, title, description, progress, repo_url, staging_url, status)
       VALUES ($1, $2, $3, 0, $4, $5, 'En Desarrollo')
       RETURNING *;`,
      [client_email.toLowerCase(), title, description || "", repo_url || "", staging_url || ""]
    );

    const newProject = projectRes.rows[0];

    // Insertar sprints opcionales si se envían
    if (sprints && Array.isArray(sprints)) {
      for (const sprint of sprints) {
        await query(
          `INSERT INTO sprints (project_id, title, status, progress) VALUES ($1, $2, $3, $4);`,
          [newProject.id, sprint.title, sprint.status || "Pendiente", sprint.progress || 0]
        );
      }
    }

    return NextResponse.json({ success: true, project: newProject });
  } catch (error) {
    console.error("❌ [API POST Project Error]", error);
    return NextResponse.json({ error: "Error al crear el proyecto." }, { status: 500 });
  }
}

/**
 * PATCH /api/projects - Actualiza un proyecto (Progreso, estado, links, etc.) (Solo Administradores).
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("skycode_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    const parsed = UpdateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "ID del proyecto es requerido." }, { status: 400 });
    }
    const { id, progress, status, repo_url, staging_url, sla_warranty_start, sla_warranty_end } = parsed.data;

    const res = await query(
      `UPDATE projects 
       SET progress = COALESCE($1, progress),
           status = COALESCE($2, status),
           repo_url = COALESCE($3, repo_url),
           staging_url = COALESCE($4, staging_url),
           sla_warranty_start = COALESCE($5, sla_warranty_start),
           sla_warranty_end = COALESCE($6, sla_warranty_end)
       WHERE id = $7
       RETURNING *;`,
      [progress, status, repo_url, staging_url, sla_warranty_start, sla_warranty_end, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: res.rows[0] });
  } catch (error) {
    console.error("❌ [API PATCH Project Error]", error);
    return NextResponse.json({ error: "Error al actualizar el proyecto." }, { status: 500 });
  }
}
