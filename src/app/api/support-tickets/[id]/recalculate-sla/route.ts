import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getTicketById, recalculateTicketSla } from "@/lib/queries/supportTickets";
import { getSettings } from "@/lib/queries/settings";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseTicketId(id: string): number | null {
  const ticketId = Number(id);
  return Number.isInteger(ticketId) && ticketId > 0 ? ticketId : null;
}

/**
 * POST /api/support-tickets/[id]/recalculate-sla - Da al ticket una
 * ventana de SLA nueva, calculada desde ahora con su prioridad ACTUAL (ver
 * lib/queries/supportTickets.ts::recalculateTicketSla). Mismo permiso que
 * editar el ticket (`support:write`) — no es autogestión, reprogramar un
 * compromiso de SLA es una decisión operativa del equipo, no del cliente
 * ni de cualquier usuario interno al azar.
 */
export async function POST(request: Request, { params }: RouteContext) {
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
    const ip = getClientIp(request);
    const settings = await getSettings();
    const slaWindowHours = {
      Urgente: settings.slaHoursUrgente,
      Alta: settings.slaHoursAlta,
      Media: settings.slaHoursMedia,
      Baja: settings.slaHoursBaja,
    };

    const result = await withTransaction(async (client) => {
      const outcome = await recalculateTicketSla(ticketId, client, slaWindowHours);

      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "support_ticket.recalculate_sla",
          entityType: "support_ticket",
          entityId: ticketId,
          diff: { before: outcome.before, after: outcome.after },
          ip,
        });
      }

      return outcome;
    });

    if (result.outcome === "not_found") {
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: await getTicketById(ticketId) });
  } catch (error) {
    logError("❌ [API POST Recalculate SLA Error]", error);
    return NextResponse.json({ error: "Error al recalcular el SLA." }, { status: 500 });
  }
}
