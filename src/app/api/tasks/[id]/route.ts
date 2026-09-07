import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction, query } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getTaskById, updateTask, updateOwnTaskStatus, softDeleteTask } from "@/lib/queries/tasks";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const StatusOnlySchema = z.object({ status: z.enum(["Pendiente", "En Progreso", "Completada"]) });

const FullUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  sprint_id: z.number().int().positive().nullable().optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  status: z.enum(["Pendiente", "En Progreso", "Completada"]).optional(),
  estimated_hours: z.number().nonnegative().max(1000).nullable().optional(),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

function parseTaskId(id: string): number | null {
  const taskId = Number(id);
  return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
}

/**
 * PATCH /api/tasks/[id] - Dos caminos según quién llama:
 *
 * - Con `tasks:write` (admin/sales_manager): edita cualquier campo de
 *   cualquier tarea.
 * - Sin `tasks:write`: solo puede cambiar el `status` de una tarea que
 *   tiene asignada a sí mismo, y el body debe traer *únicamente* `status`
 *   — mandar `title` u otro campo junto con `status` sin tener
 *   `tasks:write` es 403, no un update parcial silencioso.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const taskId = parseTaskId((await params).id);
  if (taskId === null) {
    return NextResponse.json({ error: "ID de tarea inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const ip = getClientIp(request);

  try {
    if (hasPermission(session.role, "tasks:write")) {
      const parsed = FullUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos de tarea inválidos." }, { status: 400 });
      }
      if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
      }

      const result = await withTransaction(async (client) => {
        const updated = await updateTask(taskId, parsed.data, client);
        if (!updated) return null;

        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "task.update",
          entityType: "task",
          entityId: taskId,
          diff: updated,
          ip,
        });

        return updated;
      });

      if (!result) {
        return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
      }

      return NextResponse.json({ success: true, task: await getTaskById(taskId) });
    }

    // Autogestión: solo status, solo si es el propio responsable.
    const isStatusOnly = Object.keys(body).length === 1 && "status" in body;
    if (!isStatusOnly) {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    const parsed = StatusOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const updated = await updateOwnTaskStatus(taskId, parsed.data.status, session.id);
    if (!updated) {
      return NextResponse.json({ error: "Tarea no encontrada o no asignada a usted." }, { status: 404 });
    }

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "task.update_own_status",
      entityType: "task",
      entityId: taskId,
      diff: { after: { status: parsed.data.status } },
      ip,
    });

    return NextResponse.json({ success: true, task: await getTaskById(taskId) });
  } catch (error) {
    logError("❌ [API PATCH Task Error]", error);
    return NextResponse.json({ error: "Error al actualizar la tarea." }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id] - Borrado lógico. Requiere `tasks:write`.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "tasks:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const taskId = parseTaskId((await params).id);
  if (taskId === null) {
    return NextResponse.json({ error: "ID de tarea inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const result = await softDeleteTask(taskId, client);
      if (!result) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "task.delete",
        entityType: "task",
        entityId: taskId,
        ip,
      });

      return result;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Task Error]", error);
    return NextResponse.json({ error: "Error al eliminar la tarea." }, { status: 500 });
  }
}
