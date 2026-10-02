import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { invalidateSessionCache } from "@/lib/authSession";
import { clearUserAvatar, setUserAvatar } from "@/lib/queries/userProfile";
import {
  deleteAvatarFilesQuietly,
  isAvatarValidationError,
  processAndUploadAvatar,
} from "@/lib/avatarStorage";
import { logError } from "@/lib/logger";

/**
 * POST /api/account/avatar - Sube la foto de perfil propia
 * (`multipart/form-data`, campo `file`). Autogestión sin permiso RBAC,
 * disponible para los 4 roles.
 *
 * Orden deliberado (mismo que la subida de imágenes del portafolio):
 *   1. procesar y subir las variantes al bucket — si el archivo no es una
 *      imagen válida, falla ACÁ, antes de tocar la base;
 *   2. apuntar la fila al avatar nuevo dentro de una transacción;
 *   3. recién después del commit, borrar los archivos del avatar viejo.
 * Si el paso 2 fallara, las variantes nuevas quedan huérfanas en el
 * bucket (invisibles, sin fila que las referencie) — preferible a una fila
 * apuntando a archivos que ya se borraron.
 *
 * Rate limit porque cada subida corre sharp 3 veces y escribe 3 objetos:
 * sin límite, una sesión cualquiera podría usarla para gastar CPU y
 * almacenamiento a voluntad.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session, sessionId } = auth;

  try {
    if (await isRateLimited(`avatar-upload:${session.id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas subidas. Intente de nuevo más tarde." }, { status: 429 });
    }

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
    const previousKey = await withTransaction(async (client) => {
      const previous = await setUserAvatar(session.id, processed, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "user.avatar_upload",
        entityType: "user",
        entityId: session.id,
        diff: { after: { storageKey: processed.storageKey } },
        ip,
      });
      return previous;
    });

    await deleteAvatarFilesQuietly(previousKey, (error) =>
      logError("⚠️ [Avatar] No se pudo borrar el avatar anterior del bucket", error, { previousKey })
    );
    // El avatar viaja en la sesión cacheada (header del dashboard/portal).
    invalidateSessionCache(sessionId);

    return NextResponse.json({ success: true, avatar: processed.variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen.";
    if (isAvatarValidationError(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logError("❌ [API POST Account Avatar Error]", error);
    return NextResponse.json({ error: "Error al subir la imagen." }, { status: 500 });
  }
}

/** DELETE /api/account/avatar - Quita la foto propia (vuelve a las iniciales). */
export async function DELETE(request: Request) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session, sessionId } = auth;

  try {
    const ip = getClientIp(request);
    const previousKey = await withTransaction(async (client) => {
      const previous = await clearUserAvatar(session.id, client);
      if (previous) {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "user.avatar_remove",
          entityType: "user",
          entityId: session.id,
          diff: { before: { storageKey: previous } },
          ip,
        });
      }
      return previous;
    });

    await deleteAvatarFilesQuietly(previousKey, (error) =>
      logError("⚠️ [Avatar] No se pudo borrar el avatar del bucket", error, { previousKey })
    );
    invalidateSessionCache(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Account Avatar Error]", error);
    return NextResponse.json({ error: "Error al quitar la imagen." }, { status: 500 });
  }
}
