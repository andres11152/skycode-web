import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { revokeOwnSession } from "@/lib/queries/sessions";
import { invalidateSessionCache } from "@/lib/authSession";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const IdSchema = z.uuid();

/**
 * DELETE /api/sessions/[id] - Revoca una sesión propia (ej. "cerrar sesión
 * en ese dispositivo que ya no tengo"). Nunca la de otra persona —
 * `revokeOwnSession` exige que pertenezca al usuario autenticado. Si es la
 * sesión con la que se hizo esta misma request, el efecto es igual a un
 * logout: el próximo request con esa cookie ya no resuelve (ver
 * lib/authSession.ts::resolveSession).
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!IdSchema.safeParse(id).success) {
    return NextResponse.json({ error: "ID de sesión inválido." }, { status: 400 });
  }

  try {
    const revoked = await revokeOwnSession(id, auth.session.id);
    if (!revoked) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    invalidateSessionCache(id);

    await logAudit(query, {
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "session.revoke",
      entityType: "session",
      entityId: id,
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Session Error]", error);
    return NextResponse.json({ error: "Error al revocar la sesión." }, { status: 500 });
  }
}
