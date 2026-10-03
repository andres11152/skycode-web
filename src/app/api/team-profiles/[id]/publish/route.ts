import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { setTeamProfilePublished } from "@/lib/queries/teamProfiles";
import { revalidateTeamPaths } from "@/lib/revalidateTeam";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PublishSchema = z.object({ isPublished: z.boolean() }).strict();

/**
 * PATCH /api/team-profiles/[id]/publish - Publica o despublica. Ruta aparte
 * del PATCH general porque publicar tiene su propia validación (nombre y
 * cargo en español, ver `setTeamProfilePublished`) — mismo criterio que el
 * estado de los casos del portafolio.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const parsed = PublishSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

    const ip = getClientIp(request);
    const result = await withTransaction(async (client) => {
      const outcome = await setTeamProfilePublished(id, parsed.data.isPublished, session.id, client);
      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: parsed.data.isPublished ? "team_profile.publish" : "team_profile.unpublish",
          entityType: "team_profile",
          entityId: id,
          ip,
        });
      }
      return outcome;
    });

    if (result.outcome === "not_found") return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    if (result.outcome === "missing_spanish_translation") {
      return NextResponse.json(
        { error: "Completa al menos el nombre y el cargo en español antes de publicar." },
        { status: 400 }
      );
    }

    revalidateTeamPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Team Profile Publish Error]", error);
    return NextResponse.json({ error: "Error al cambiar la publicación." }, { status: 500 });
  }
}
