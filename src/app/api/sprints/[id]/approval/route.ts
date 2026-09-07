import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { approveSprint } from "@/lib/queries/projects";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ApprovalSchema = z.object({
  status: z.enum(["aprobado", "rechazado"]),
  comment: z.string().trim().max(2000).optional(),
});

function parseSprintId(id: string): number | null {
  const sprintId = Number(id);
  return Number.isInteger(sprintId) && sprintId > 0 ? sprintId : null;
}

/**
 * PATCH /api/sprints/[id]/approval - El cliente aprueba o rechaza un
 * sprint/entregable ya completado, desde /portal. Exclusivo de sesiones
 * `role === "client"` con `clientId` propio — no pasa por `withAuth`
 * porque `client` no tiene permisos declarados en rbac.ts (su acceso es
 * por dueño, mismo criterio que `/api/projects`). Un admin/sales_manager
 * NO puede aprobar sus propios entregables por acá — la aprobación es
 * intencionalmente una acción exclusiva del cliente.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (session.role !== "client" || !session.clientId) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const sprintId = parseSprintId((await params).id);
  if (sprintId === null) {
    return NextResponse.json({ error: "ID de sprint inválido." }, { status: 400 });
  }

  const parsed = ApprovalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de aprobación inválidos." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const result = await withTransaction(async (client) => {
      const outcome = await approveSprint(sprintId, session.clientId!, parsed.data, session.id, client);

      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: parsed.data.status === "aprobado" ? "sprint.approve" : "sprint.reject",
          entityType: "sprint",
          entityId: sprintId,
          diff: { after: outcome.sprint },
          ip,
        });
      }

      return outcome;
    });

    switch (result.outcome) {
      case "ok":
        return NextResponse.json({ success: true, sprint: result.sprint });
      case "not_found":
      case "not_owner":
        // Mismo código para ambos — no distinguir "no existe" de "no es
        // tuyo" evita que un cliente pueda enumerar sprints ajenos
        // probando IDs y comparando el mensaje de error.
        return NextResponse.json({ error: "Entregable no encontrado." }, { status: 404 });
      case "not_completed":
        return NextResponse.json({ error: "Solo se pueden aprobar entregables ya completados." }, { status: 400 });
      case "already_decided":
        return NextResponse.json({ error: "Este entregable ya fue aprobado o rechazado." }, { status: 409 });
    }
  } catch (error) {
    logError("❌ [API PATCH Sprint Approval Error]", error);
    return NextResponse.json({ error: "Error al procesar la aprobación." }, { status: 500 });
  }
}
