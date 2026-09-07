import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAllTickets, getClientTickets, createTicket, getTicketById, isProjectOwnedByClient } from "@/lib/queries/supportTickets";
import { getSettings } from "@/lib/queries/settings";
import { logError } from "@/lib/logger";

const CreateTicketSchema = z.object({
  project_id: z.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["Baja", "Media", "Alta", "Urgente"]).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
});

// Un cliente solo puede mandar estos tres campos — `.strict()` rechaza
// `priority`/`assignee_id` con un 400 en vez de ignorarlos en silencio
// (mismo criterio que el self-service de `PATCH /api/tasks/[id]`: quien
// no tiene el permiso completo no decide silenciosamente qué se aplica y
// qué no de su body).
const ClientCreateTicketSchema = z
  .object({
    project_id: z.number().int().positive(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional(),
  })
  .strict();

/**
 * GET /api/support-tickets - Admin/sales_manager (support:read) ven
 * todos los tickets, ordenados por SLA. Un cliente ve solo los de sus
 * proyectos (por dueño, no por permiso, mismo criterio que
 * `/api/projects`), ordenados por creación — ver `getClientTickets`.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    let tickets;
    if (session.role === "client") {
      tickets = session.clientId ? await getClientTickets(session.clientId) : [];
    } else if (hasPermission(session.role, "support:read")) {
      tickets = await getAllTickets();
    } else {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    logError("❌ [API GET Support Tickets Error]", error);
    return NextResponse.json({ error: "Error al obtener los tickets." }, { status: 500 });
  }
}

/**
 * POST /api/support-tickets - Dos caminos según quién llama:
 *
 * - Con `support:write` (admin/sales_manager): crea con cualquier
 *   prioridad/responsable, contra cualquier proyecto.
 * - Sin ese permiso pero `role === "client"`: abre un ticket contra UNO
 *   DE SUS PROPIOS proyectos (verificado con `isProjectOwnedByClient`),
 *   siempre en prioridad "Media" y sin responsable — el cliente no decide
 *   la prioridad operativa ni a quién se le asigna.
 *
 * El SLA (`sla_due_at`) se calcula server-side según la prioridad al
 * crear, con la ventana en horas de `settings.sla_hours_*` (editable en
 * /dashboard/configuracion) — ver lib/queries/supportTickets.ts.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const canWrite = hasPermission(session.role, "support:write");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canWrite && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = canWrite ? CreateTicketSchema.safeParse(body) : ClientCreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de ticket inválidos." }, { status: 400 });
    }

    if (!canWrite) {
      const owned = await isProjectOwnedByClient(parsed.data.project_id, session.clientId!);
      if (!owned) {
        return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
      }
    }

    const ip = getClientIp(request);
    const settings = await getSettings();
    const slaWindowHours = {
      Urgente: settings.slaHoursUrgente,
      Alta: settings.slaHoursAlta,
      Media: settings.slaHoursMedia,
      Baja: settings.slaHoursBaja,
    };

    const ticketId = await withTransaction(async (client) => {
      const id = await createTicket(parsed.data, session.id, client, slaWindowHours);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "support_ticket.create",
        entityType: "support_ticket",
        entityId: id,
        diff: { after: parsed.data },
        ip,
      });

      return id;
    });

    const created = await getTicketById(ticketId);
    return NextResponse.json({ success: true, ticket: created });
  } catch (error) {
    logError("❌ [API POST Support Ticket Error]", error);
    return NextResponse.json({ error: "Error al crear el ticket." }, { status: 500 });
  }
}
