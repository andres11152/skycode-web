import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { updateRetainer, softDeleteRetainer } from "@/lib/queries/retainers";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateRetainerSchema = z
  .object({
    status: z.enum(["active", "paused", "cancelled"]).optional(),
    amount: z.number().positive().max(1_000_000_000).optional(),
    description: z.string().trim().min(1).max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No se envió ningún cambio." });

function parseRetainerId(id: string): number | null {
  const retainerId = Number(id);
  return Number.isInteger(retainerId) && retainerId > 0 ? retainerId : null;
}

/**
 * PATCH /api/retainers/[id] - Cambia estado (activo/pausado/cancelado),
 * monto o descripción. Mismo permiso que crear (`invoices:write`) — no
 * hay autogestión acá, solo admin decide pausar o cambiar un cobro
 * recurrente.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "invoices:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const retainerId = parseRetainerId((await params).id);
  if (retainerId === null) {
    return NextResponse.json({ error: "ID de retainer inválido." }, { status: 400 });
  }

  const parsed = UpdateRetainerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const updated = await withTransaction(async (client) => {
      const result = await updateRetainer(retainerId, parsed.data, client);
      if (!result) return false;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "retainer.update",
        entityType: "retainer",
        entityId: retainerId,
        diff: { after: parsed.data },
        ip,
      });

      return true;
    });

    if (!updated) {
      return NextResponse.json({ error: "Retainer no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Retainer Error]", error);
    return NextResponse.json({ error: "Error al actualizar el retainer." }, { status: 500 });
  }
}

/**
 * DELETE /api/retainers/[id] - Borrado lógico. A diferencia de pausar
 * (`status: "paused"`, reversible con intención de reanudar), esto es
 * para un retainer que terminó de verdad — deja de existir para
 * cualquier corrida futura del cron, sin volver a aparecer en el listado.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "invoices:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const retainerId = parseRetainerId((await params).id);
  if (retainerId === null) {
    return NextResponse.json({ error: "ID de retainer inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const result = await softDeleteRetainer(retainerId, client);
      if (!result) return false;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "retainer.delete",
        entityType: "retainer",
        entityId: retainerId,
        ip,
      });

      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Retainer no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Retainer Error]", error);
    return NextResponse.json({ error: "Error al eliminar el retainer." }, { status: 500 });
  }
}
