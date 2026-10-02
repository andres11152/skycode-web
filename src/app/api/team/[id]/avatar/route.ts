import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { clearUserAvatar, setUserAvatar } from "@/lib/queries/userProfile";
import {
  deleteAvatarFilesQuietly,
  isAvatarValidationError,
  processAndUploadAvatar,
} from "@/lib/avatarStorage";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseUserId(id: string): number | null {
  const userId = Number(id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

/**
 * POST /api/team/[id]/avatar - Un admin (`team:write`) sube la foto de
 * otra persona — útil para dejar listo el directorio del equipo sin
 * esperar a que cada quien entre a subir la suya. Mismo pipeline y mismo
 * orden "procesar → transacción → borrar el viejo" que la subida propia
 * (ver /api/account/avatar).
 *
 * `requireSession()` + `hasPermission()` a mano en vez de `withAuth()`
 * porque la ruta necesita `params` — mismo motivo que las rutas de
 * imágenes del portafolio.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const userId = parseUserId((await params).id);
  if (userId === null) {
    return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debe adjuntar una imagen." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const processed = await processAndUploadAvatar(Buffer.from(await file.arrayBuffer()));

    const ip = getClientIp(request);
    const result = await withTransaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM users WHERE id = $1;", [userId]);
      if (exists.rows.length === 0) return { found: false as const };

      const previous = await setUserAvatar(userId, processed, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "user.avatar_upload",
        entityType: "user",
        entityId: userId,
        diff: { after: { storageKey: processed.storageKey } },
        ip,
      });
      return { found: true as const, previous };
    });

    if (!result.found) {
      // La persona no existe: las variantes recién subidas no las
      // referencia nadie, se borran ahora en vez de dejarlas huérfanas.
      await deleteAvatarFilesQuietly(processed.storageKey, (error) =>
        logError("⚠️ [Avatar] No se pudo limpiar un avatar sin dueño", error)
      );
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }

    await deleteAvatarFilesQuietly(result.previous, (error) =>
      logError("⚠️ [Avatar] No se pudo borrar el avatar anterior del bucket", error, { previousKey: result.previous })
    );
    return NextResponse.json({ success: true, avatar: processed.variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen.";
    if (isAvatarValidationError(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logError("❌ [API POST Team Avatar Error]", error);
    return NextResponse.json({ error: "Error al subir la imagen." }, { status: 500 });
  }
}

/** DELETE /api/team/[id]/avatar - Un admin quita la foto de otra persona. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "team:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const userId = parseUserId((await params).id);
  if (userId === null) {
    return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const previousKey = await withTransaction(async (client) => {
      const previous = await clearUserAvatar(userId, client);
      if (previous) {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "user.avatar_remove",
          entityType: "user",
          entityId: userId,
          diff: { before: { storageKey: previous } },
          ip,
        });
      }
      return previous;
    });

    await deleteAvatarFilesQuietly(previousKey, (error) =>
      logError("⚠️ [Avatar] No se pudo borrar el avatar del bucket", error, { previousKey })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Team Avatar Error]", error);
    return NextResponse.json({ error: "Error al quitar la imagen." }, { status: 500 });
  }
}
