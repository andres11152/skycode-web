import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { clearTeamProfileAvatar, setTeamProfileAvatar } from "@/lib/queries/teamProfiles";
import { deletePortfolioImageFiles, processAndUploadPortfolioImage } from "@/lib/portfolioStorage";
import { revalidateTeamPaths } from "@/lib/revalidateTeam";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function deleteQuietly(storageKey: string | null) {
  if (!storageKey) return;
  try {
    await deletePortfolioImageFiles(storageKey);
  } catch (error) {
    logError("⚠️ [Team Profile] No se pudo borrar la foto anterior del bucket", error, { storageKey });
  }
}

/**
 * POST /api/team-profiles/[id]/photo - Foto de la tarjeta pública.
 *
 * Usa el pipeline del PORTAFOLIO (`processAndUploadPortfolioImage`: anchos
 * 400/800/1600 conservando la proporción), no el de avatares
 * (`lib/avatarStorage.ts`, cuadrados de máximo 256px): la tarjeta de
 * `/equipo` muestra la foto en formato retrato 3:4 a ancho completo en
 * móvil — un cuadrado de 256px se vería recortado y pixelado ahí. El
 * recorte final lo hace el CSS (`object-cover`), así la persona puede subir
 * su foto tal cual sin pensar en proporciones.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Debe adjuntar una imagen." }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });

    const processed = await processAndUploadPortfolioImage(Buffer.from(await file.arrayBuffer()));

    const ip = getClientIp(request);
    const result = await withTransaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM team_profiles WHERE id = $1 AND deleted_at IS NULL;", [id]);
      if (exists.rows.length === 0) return { found: false as const };

      const previous = await setTeamProfileAvatar(id, { storageKey: processed.storageKey, variants: processed.variants }, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "team_profile.photo_upload",
        entityType: "team_profile",
        entityId: id,
        diff: { after: { storageKey: processed.storageKey } },
        ip,
      });
      return { found: true as const, previous };
    });

    if (!result.found) {
      await deleteQuietly(processed.storageKey);
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }
    await deleteQuietly(result.previous);
    revalidateTeamPaths();
    return NextResponse.json({ success: true, photo: processed.variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen.";
    if (message.includes("Formato de imagen") || message.includes("tamaño máximo")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logError("❌ [API POST Team Profile Photo Error]", error);
    return NextResponse.json({ error: "Error al subir la imagen." }, { status: 500 });
  }
}

/** DELETE /api/team-profiles/[id]/photo - La tarjeta vuelve a mostrar las iniciales. */
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
    const previous = await withTransaction(async (client) => {
      const key = await clearTeamProfileAvatar(id, client);
      if (key) {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "team_profile.photo_remove",
          entityType: "team_profile",
          entityId: id,
          diff: { before: { storageKey: key } },
          ip,
        });
      }
      return key;
    });
    await deleteQuietly(previous);
    revalidateTeamPaths();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Team Profile Photo Error]", error);
    return NextResponse.json({ error: "Error al quitar la imagen." }, { status: 500 });
  }
}
