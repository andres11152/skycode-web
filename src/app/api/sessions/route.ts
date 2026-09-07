import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { getActiveUserSessions } from "@/lib/queries/sessions";
import { logError } from "@/lib/logger";

/**
 * GET /api/sessions - Sesiones activas del usuario autenticado. Sin
 * permiso RBAC — es autogestión (cualquier rol ve y revoca las suyas),
 * mismo criterio que registrar horas propias.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  try {
    const sessions = await getActiveUserSessions(auth.session.id);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    logError("❌ [API GET Sessions Error]", error);
    return NextResponse.json({ error: "Error al obtener las sesiones." }, { status: 500 });
  }
}
