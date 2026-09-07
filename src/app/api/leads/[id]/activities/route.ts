import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getLeadActivities, addLeadActivity } from "@/lib/queries/leads";
import { logError } from "@/lib/logger";

const CreateActivitySchema = z.object({
  type: z.enum(["note", "call", "email"]),
  body: z.string().trim().min(1).max(5000),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseLeadId(id: string): number | null {
  const leadId = Number(id);
  return Number.isInteger(leadId) && leadId > 0 ? leadId : null;
}

/**
 * GET /api/leads/[id]/activities - Historial de interacciones con un lead
 * (llamadas, correos, notas, cambios de estado automáticos). Requiere
 * leads:read. Se consulta bajo demanda al abrir el detalle de un lead, no
 * junto al listado — traerlo para cada fila de la tabla sería desperdicio.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "leads:read")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const leadId = parseLeadId((await params).id);
  if (leadId === null) {
    return NextResponse.json({ error: "ID de prospecto inválido." }, { status: 400 });
  }

  try {
    const activities = await getLeadActivities(leadId);
    return NextResponse.json({ success: true, activities });
  } catch (error) {
    logError("❌ [API GET Lead Activities Error]", error);
    return NextResponse.json({ error: "Error al obtener actividades." }, { status: 500 });
  }
}

/**
 * POST /api/leads/[id]/activities - Registra una llamada, correo o nota.
 * Requiere leads:write. No se duplica en `audit_log`: esta tabla es el
 * historial de interacción con el prospecto, `audit_log` es la traza de
 * cambios de datos del sistema — son dos cosas distintas a propósito.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "leads:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const leadId = parseLeadId((await params).id);
  if (leadId === null) {
    return NextResponse.json({ error: "ID de prospecto inválido." }, { status: 400 });
  }

  try {
    const parsed = CreateActivitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de actividad inválidos." }, { status: 400 });
    }
    const { type, body } = parsed.data;

    const activity = await addLeadActivity({
      leadId,
      actorId: session.id,
      actorName: session.name,
      type,
      body,
    });

    if (!activity) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    logError("❌ [API POST Lead Activity Error]", error);
    return NextResponse.json({ error: "Error al registrar la actividad." }, { status: 500 });
  }
}

