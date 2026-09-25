import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getProjectTasks, createTask, getTaskById } from "@/lib/queries/tasks";
import { logError } from "@/lib/logger";

const CreateTaskSchema = z.object({
  project_id: z.number().int().positive(),
  sprint_id: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  estimated_hours: z.number().nonnegative().max(1000).nullable().optional(),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/**
 * GET /api/tasks?projectId=N - Tareas de UN proyecto. Requiere
 * `tasks:read`. Para la vista cruzando todos los proyectos ("Mis Tareas"),
 * ver `GET /api/tasks/mine`.
 */
export const GET = withAuth("tasks:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get("projectId"));
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "projectId inválido." }, { status: 400 });
    }

    const tasks = await getProjectTasks(projectId);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    logError("❌ [API GET Tasks Error]", error);
    return NextResponse.json({ error: "Error al obtener las tareas." }, { status: 500 });
  }
});

/**
 * POST /api/tasks - Crea una tarea bajo un proyecto. Requiere
 * `tasks:write`. No valida acá que `project_id` exista y no esté borrado
 * — un id inexistente simplemente no aparece en ningún listado (la FK de
 * `tasks.project_id` sí lo rechazaría si fuera realmente inexistente).
 */
export const POST = withAuth("tasks:write", async (request, { session }) => {
  try {
    const parsed = CreateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de tarea inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);

    const task = await withTransaction(async (client) => {
      const taskId = await createTask(parsed.data, session.id, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "task.create",
        entityType: "task",
        entityId: taskId,
        diff: { after: parsed.data },
        ip,
      });

      return taskId;
    });

    const created = await getTaskById(task);
    return NextResponse.json({ success: true, task: created });
  } catch (error) {
    logError("❌ [API POST Task Error]", error);
    return NextResponse.json({ error: "Error al crear la tarea." }, { status: 500 });
  }
});
