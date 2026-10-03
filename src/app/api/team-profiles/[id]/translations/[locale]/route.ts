import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { isLocale } from "@/lib/i18n";
import { upsertTeamProfileTranslation } from "@/lib/queries/teamProfiles";
import { TeamProfileTranslationSchema } from "@/lib/profileValidation";
import { revalidateTeamPaths } from "@/lib/revalidateTeam";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string; locale: string }>;
}

/**
 * PATCH /api/team-profiles/[id]/translations/[locale] - Nombre, cargo
 * público y bio en un idioma. Se manda el bloque completo de ese idioma
 * (mismo criterio que las traducciones del portafolio): son 3 campos que se
 * editan juntos en el mismo formulario.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const { id: rawId, locale } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  if (!isLocale(locale)) return NextResponse.json({ error: "Idioma inválido." }, { status: 400 });

  try {
    const parsed = TeamProfileTranslationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const found = await withTransaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM team_profiles WHERE id = $1 AND deleted_at IS NULL;", [id]);
      if (exists.rows.length === 0) return false;

      await upsertTeamProfileTranslation(id, locale, parsed.data, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team_profile.translation_update",
        entityType: "team_profile",
        entityId: id,
        diff: { after: { locale, ...parsed.data } },
        ip,
      });
      return true;
    });
    if (!found) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });

    revalidateTeamPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Team Profile Translation Error]", error);
    return NextResponse.json({ error: "Error al guardar la traducción." }, { status: 500 });
  }
}
