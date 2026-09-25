import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { isProjectOwnedByClient } from "@/lib/queries/supportTickets";
import { getOnboardingItems } from "@/lib/queries/onboarding";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/onboarding - Checklist de onboarding del
 * proyecto. Dos caminos, mismo criterio que documentos/comentarios de
 * sprint: equipo interno con `tasks:read` ve cualquier proyecto; un
 * cliente ve solo el de sus propios proyectos.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const projectId = Number((await params).id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  const canRead = hasPermission(session.role, "tasks:read");
  const isClient = session.role === "client" && !!session.clientId;
  if (!canRead && !isClient) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    if (isClient && !(await isProjectOwnedByClient(projectId, session.clientId!))) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    const items = await getOnboardingItems(projectId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    logError("❌ [API GET Onboarding Error]", error);
    return NextResponse.json({ error: "Error al obtener el checklist de onboarding." }, { status: 500 });
  }
}
