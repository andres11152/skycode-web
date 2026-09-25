import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { getUserNotifications, markAllNotificationsRead } from "@/lib/queries/notifications";
import { logError } from "@/lib/logger";

/**
 * GET /api/notifications - Últimas notificaciones del usuario autenticado
 * más el conteo de no leídas. Sin permiso RBAC — es autogestión (cada
 * quien ve solo las suyas), mismo criterio que `/api/sessions`.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const { notifications, unreadCount } = await getUserNotifications(auth.session.id);
    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    logError("❌ [API GET Notifications Error]", error);
    return NextResponse.json({ error: "Error al obtener las notificaciones." }, { status: 500 });
  }
}

/**
 * POST /api/notifications - Marca TODAS las notificaciones propias como
 * leídas de una sola vez ("Marcar todas como leídas" del dropdown). Una
 * notificación individual se marca con `PATCH /api/notifications/[id]`.
 */
export async function POST() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    await markAllNotificationsRead(auth.session.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Notifications (mark all read) Error]", error);
    return NextResponse.json({ error: "Error al marcar las notificaciones como leídas." }, { status: 500 });
  }
}
