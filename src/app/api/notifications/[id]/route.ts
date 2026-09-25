import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { markNotificationRead } from "@/lib/queries/notifications";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id] - Marca una notificación propia como
 * leída (click en el dropdown de la campanita). `markNotificationRead`
 * exige `user_id = session.id` como única barrera contra marcar la de
 * otra persona — 404, no 403, mismo criterio que el resto del portal: no
 * confirmar que la notificación existe si no es del usuario que llama.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const notificationId = Number(id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return NextResponse.json({ error: "ID de notificación inválido." }, { status: 400 });
  }

  try {
    const marked = await markNotificationRead(notificationId, auth.session.id);
    if (!marked) {
      return NextResponse.json({ error: "Notificación no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Notification Error]", error);
    return NextResponse.json({ error: "Error al marcar la notificación como leída." }, { status: 500 });
  }
}
