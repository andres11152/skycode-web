import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession, withAuth } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import {
  getAllActiveProjects,
  getClientProjects,
  createProjectWithClient,
  updateProject,
  softDeleteProject,
} from "@/lib/queries/projects";

const ProjectStatusSchema = z.enum(["Planificación", "En Desarrollo", "Fase QA", "Entregado", "Garantía SLA"]);
const SprintStatusSchema = z.enum(["Completado", "En Progreso", "Pendiente"]);

const CreateProjectSchema = z.object({
  client_email: z.email().trim().max(254),
  client_name: z.string().trim().min(1).max(255),
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
 * GET /api/projects - Admin/sales_manager ven todos los proyectos; un
 * cliente ve solo los suyos (por `users.client_id` → `projects.client_id`).
 * El acceso de cliente es por dueño, no por permiso de rol — no pasa por
 * `withAuth`/`hasPermission`.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    let projects;
    if (session.role === "client") {
      if (!session.clientId) {
        // Cuenta de portal sin cliente vinculado todavía: sin proyectos,
        // no es un error del sistema.
        return NextResponse.json({ success: true, projects: [] });
      }
      projects = await getClientProjects(session.clientId);
    } else if (hasPermission(session.role, "projects:read")) {
      projects = await getAllActiveProjects();
    } else {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("❌ [API GET Projects Error]", error);
    return NextResponse.json({ error: "Error de servidor al obtener proyectos." }, { status: 500 });
  }
}

/**
 * POST /api/projects - Crea un nuevo proyecto. Requiere projects:write.
 * `client_email`/`client_name` identifican al cliente; si ya existe una
 * fila en `clients` con ese correo se reutiliza (nunca se sobreescribe su
 * nombre — evita que un typo en un proyecto nuevo corrompa un cliente ya
 * establecido).
 */
export const POST = withAuth("projects:write", async (request, { session }) => {
  try {
    const parsed = CreateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "El cliente y el título son requeridos." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const newProject = await withTransaction(async (client) => {
      const project = await createProjectWithClient(parsed.data, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "project.create",
        entityType: "project",
        entityId: project.id,
        diff: { after: project },
        ip,
      });

      return project;
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (error) {
    console.error("❌ [API POST Project Error]", error);
    return NextResponse.json({ error: "Error al crear el proyecto." }, { status: 500 });
  }
});

/**
 * PATCH /api/projects - Actualiza un proyecto. Requiere projects:write.
 */
export const PATCH = withAuth("projects:write", async (request, { session }) => {
  try {
    const parsed = UpdateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "ID del proyecto es requerido." }, { status: 400 });
    }
    const { id, ...data } = parsed.data;
    const ip = getClientIp(request);

    const project = await withTransaction(async (client) => {
      const result = await updateProject(id, data, client);
      if (!result) return null;

      const { before, after } = result;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "project.update",
        entityType: "project",
        entityId: id,
        diff: { before, after },
        ip,
      });

      return after;
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("❌ [API PATCH Project Error]", error);
    return NextResponse.json({ error: "Error al actualizar el proyecto." }, { status: 500 });
  }
});

/**
 * DELETE /api/projects?id=123 - Borrado lógico (deleted_at), nunca físico.
 * Requiere projects:write.
 */
export const DELETE = withAuth("projects:write", async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const row = await softDeleteProject(id, client);
      if (!row) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "project.delete",
        entityType: "project",
        entityId: id,
        diff: { before: row },
        ip,
      });

      return row;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API DELETE Project Error]", error);
    return NextResponse.json({ error: "Error al eliminar el proyecto." }, { status: 500 });
  }
});

