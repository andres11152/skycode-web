import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/team/[id]/sessions - Un admin (`team:write`) cierra TODAS las
 * sesiones activas de otra persona sin desactivar su cuenta. Hasta acá la
 * única forma era desactivarla y reactivarla — demasiado para el caso
 * típico ("perdí el celular con la sesión abierta"): la persona vuelve a
 * entrar con su contraseña al minuto siguiente.
 *
 * No se permite sobre uno mismo: para eso está "Mi Cuenta", que preserva
 * la sesión actual en vez de echarte del panel a mitad de la acción.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const userId = Number((await params).id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
  }
  if (String(userId) === String(session.id)) {
    return NextResponse.json({ error: "Para tus propias sesiones usa Mi Cuenta." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const revoked = await withTransaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM users WHERE id = $1;", [userId]);
      if (exists.rows.length === 0) return null;

      const res = await client.query(
        "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING id;",
        [userId]
      );
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team.revoke_sessions",
        entityType: "user",
        entityId: userId,
        diff: { after: { revokedCount: res.rows.length } },
        ip,
      });
      return res.rows.length;
    });

    if (revoked === null) {
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true, revoked });
  } catch (error) {
    logError("❌ [API DELETE Team Sessions Error]", error);
    return NextResponse.json({ error: "Error al cerrar las sesiones." }, { status: 500 });
  }
}
