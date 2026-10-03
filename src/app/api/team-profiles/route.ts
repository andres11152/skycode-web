import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { createTeamProfile, getAdminTeamProfiles } from "@/lib/queries/teamProfiles";
import { revalidateTeamPaths } from "@/lib/revalidateTeam";
import { logError } from "@/lib/logger";
import { TEAM_PROFILE_SLUG } from "@/lib/profileValidation";

/**
 * Perfiles públicos de `/equipo`. Mismo permiso que administrar el equipo
 * (`team:read`/`team:write`, solo admin): quién aparece en la web como
 * parte de la agencia es una decisión de la misma persona que decide
 * quién tiene acceso al panel — no un permiso nuevo para una sola pantalla.
 */
export const GET = withAuth("team:read", async () => {
  try {
    return NextResponse.json({ success: true, profiles: await getAdminTeamProfiles() });
  } catch (error) {
    logError("❌ [API GET Team Profiles Error]", error);
    return NextResponse.json({ error: "Error al obtener los perfiles." }, { status: 500 });
  }
});

const CreateSchema = z.object({ slug: TEAM_PROFILE_SLUG }).strict();

/** POST /api/team-profiles - Crea un perfil en borrador (sin traducciones todavía, no se puede publicar así). */
export const POST = withAuth("team:write", async (request, { session }) => {
  try {
    const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const id = await withTransaction(async (client) => {
      // Al final de la lista: un perfil nuevo no debería desplazar el orden
      // que el equipo ya eligió para los publicados.
      const max = await client.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM team_profiles WHERE deleted_at IS NULL;");
      const profileId = await createTeamProfile(
        { slug: parsed.data.slug, sortOrder: Number(max.rows[0].next), createdBy: session.id },
        client
      );
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team_profile.create",
        entityType: "team_profile",
        entityId: profileId,
        diff: { after: { slug: parsed.data.slug } },
        ip,
      });
      return profileId;
    });

    revalidateTeamPaths();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un perfil con ese identificador." }, { status: 409 });
    }
    logError("❌ [API POST Team Profile Error]", error);
    return NextResponse.json({ error: "Error al crear el perfil." }, { status: 500 });
  }
});
