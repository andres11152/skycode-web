import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getClientActivities, addClientActivity } from "@/lib/queries/clientActivities";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseClientId(id: string): number | null {
  const clientId = Number(id);
  return Number.isInteger(clientId) && clientId > 0 ? clientId : null;
}

/**
 * GET /api/clients/[id]/activities - Bitácora comercial de un cliente
 * (notas de seguimiento con fecha y autor, ver migración 0032). Requiere
 * `clients:read`, se consulta bajo demanda al abrir la ficha del cliente,
 * mismo criterio que `GET /api/leads/[id]/activities`.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "clients:read")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const clientId = parseClientId((await params).id);
  if (clientId === null) {
    return NextResponse.json({ error: "ID de cliente inválido." }, { status: 400 });
  }

  try {
    const activities = await getClientActivities(clientId);
    return NextResponse.json({ success: true, activities });
  } catch (error) {
    logError("❌ [API GET Client Activities Error]", error);
    return NextResponse.json({ error: "Error al obtener la bitácora." }, { status: 500 });
  }
}

const CreateActivitySchema = z.object({ body: z.string().trim().min(1).max(5000) });

/**
 * POST /api/clients/[id]/activities - Registra una nota de seguimiento.
 * Requiere `clients:write` — mismo permiso que editar el cliente, no algo
 * más restrictivo ni más laxo.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "clients:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const clientId = parseClientId((await params).id);
  if (clientId === null) {
    return NextResponse.json({ error: "ID de cliente inválido." }, { status: 400 });
  }

  try {
    const parsed = CreateActivitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Nota inválida." }, { status: 400 });
    }

    const activity = await addClientActivity({
      clientId,
      actorId: session.id,
      actorName: session.name,
      body: parsed.data.body,
    });

    if (!activity) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    logError("❌ [API POST Client Activity Error]", error);
    return NextResponse.json({ error: "Error al registrar la nota." }, { status: 500 });
  }
}
