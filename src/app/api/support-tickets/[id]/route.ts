import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getTicketById, updateTicket } from "@/lib/queries/supportTickets";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UpdateTicketSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["Baja", "Media", "Alta", "Urgente"]).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  status: z.enum(["Abierto", "En Progreso", "Resuelto", "Cerrado"]).optional(),
  resolution_note: z.string().trim().max(5000).optional(),
});

function parseTicketId(id: string): number | null {
  const ticketId = Number(id);
  return Number.isInteger(ticketId) && ticketId > 0 ? ticketId : null;
}

/**
 * PATCH /api/support-tickets/[id] - Edita un ticket (prioridad,
 * responsable, estado, nota de resolución). Requiere `support:write` — a
 * diferencia de las tareas, acá no hay autogestión por identidad: el
 * alcance actual es 100% interno (el cliente no abre ni edita tickets
 * desde `/portal` todavía), así que no hace falta esa segunda vía.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "support:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const ticketId = parseTicketId((await params).id);
  if (ticketId === null) {
    return NextResponse.json({ error: "ID de ticket inválido." }, { status: 400 });
  }

  try {
    const parsed = UpdateTicketSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de ticket inválidos." }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const ip = getClientIp(request);

    const result = await withTransaction(async (client) => {
      const updated = await updateTicket(ticketId, parsed.data, client);
      if (!updated) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "support_ticket.update",
        entityType: "support_ticket",
        entityId: ticketId,
        diff: updated,
        ip,
      });

      return updated;
    });

    if (!result) {
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: await getTicketById(ticketId) });
  } catch (error) {
    logError("❌ [API PATCH Support Ticket Error]", error);
    return NextResponse.json({ error: "Error al actualizar el ticket." }, { status: 500 });
  }
}
