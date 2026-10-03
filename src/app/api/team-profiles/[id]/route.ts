import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { softDeleteTeamProfile, updateTeamProfile } from "@/lib/queries/teamProfiles";
import { UpdateTeamProfileSchema } from "@/lib/profileValidation";
import { revalidateTeamPaths } from "@/lib/revalidateTeam";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * PATCH /api/team-profiles/[id] - Slug, enlaces, orden y cuenta enlazada.
 *
 * Cambiar el slug de un perfil YA publicado rompe el ancla `/equipo#slug`
 * de cualquier post del blog que lo cite como autor (`articles.author_slug`)
 * — se permite (a veces es justo corregir un error), pero el editor lo
 * advierte antes de guardar. Y enlazar una cuenta exige que exista, que
 * sea del equipo interno (no un cliente de portal) y que no esté ya
 * enlazada a otro perfil: una persona, una ficha pública.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const parsed = UpdateTeamProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }
    const data = parsed.data;

    const ip = getClientIp(request);
    const result = await withTransaction(async (client) => {
      if (data.userId) {
        const user = await client.query("SELECT role FROM users WHERE id = $1;", [data.userId]);
        if (user.rows.length === 0 || user.rows[0].role === "client") return "invalid_user" as const;
        const taken = await client.query(
          "SELECT 1 FROM team_profiles WHERE user_id = $1 AND id != $2 AND deleted_at IS NULL;",
          [data.userId, id]
        );
        if (taken.rows.length > 0) return "user_taken" as const;
      }

      const updated = await updateTeamProfile(id, data, session.id, client);
      if (!updated) return "not_found" as const;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team_profile.update",
        entityType: "team_profile",
        entityId: id,
        diff: { after: data },
        ip,
      });
      return "ok" as const;
    });

    if (result === "not_found") return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    if (result === "invalid_user") {
      return NextResponse.json({ error: "Solo se puede enlazar una cuenta del equipo interno." }, { status: 400 });
    }
    if (result === "user_taken") {
      return NextResponse.json({ error: "Esa cuenta ya está enlazada a otro perfil público." }, { status: 409 });
    }

    revalidateTeamPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un perfil con ese identificador." }, { status: 409 });
    }
    logError("❌ [API PATCH Team Profile Error]", error);
    return NextResponse.json({ error: "Error al actualizar el perfil." }, { status: 500 });
  }
}

/** DELETE /api/team-profiles/[id] - Borrado lógico; sale de la web de inmediato. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const ip = getClientIp(request);
    const slug = await withTransaction(async (client) => {
      const deleted = await softDeleteTeamProfile(id, client);
      if (deleted) {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "team_profile.delete",
          entityType: "team_profile",
          entityId: id,
          diff: { before: { slug: deleted } },
          ip,
        });
      }
      return deleted;
    });
    if (!slug) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });

    revalidateTeamPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Team Profile Error]", error);
    return NextResponse.json({ error: "Error al eliminar el perfil." }, { status: 500 });
  }
}
