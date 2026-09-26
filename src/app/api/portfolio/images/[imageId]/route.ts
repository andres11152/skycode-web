import { NextResponse } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { removePortfolioProjectImage, updatePortfolioImageAlt } from "@/lib/queries/portfolio";
import { deletePortfolioImageFiles } from "@/lib/portfolioStorage";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ imageId: string }>;
}

function parseImageId(id: string): number | null {
  const imageId = Number(id);
  return Number.isInteger(imageId) && imageId > 0 ? imageId : null;
}

// `z.record` con las 3 claves de idioma en vez de un objeto con las 3
// propiedades opcionales — el editor puede guardar solo el idioma que
// acaba de escribir, sin obligar a mandar los otros dos.
const UpdateAltSchema = z.object({
  alt: z.record(z.string(), z.string().max(300)).refine(
    (value) => Object.keys(value).every((key) => ["es", "en", "fr"].includes(key)),
    { message: "Las claves de `alt` deben ser es/en/fr." }
  ),
});

/** PATCH /api/portfolio/images/[imageId] - Actualiza el texto alternativo por idioma. Requiere `portfolio:write`. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const imageId = parseImageId((await params).imageId);
  if (imageId === null) {
    return NextResponse.json({ error: "ID de imagen inválido." }, { status: 400 });
  }

  try {
    const parsed = UpdateAltSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Texto alternativo inválido." }, { status: 400 });
    }

    await updatePortfolioImageAlt(imageId, parsed.data.alt, { query });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Image Error]", error);
    return NextResponse.json({ error: "Error al actualizar la imagen." }, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio/images/[imageId] - Borra la imagen (fila +
 * variantes del bucket). Requiere `portfolio:write`. Borra la fila
 * PRIMERO y el objeto del bucket DESPUÉS de que la transacción
 * commitea — mismo criterio que `DELETE /api/documents/[id]`: se prefiere
 * un objeto huérfano invisible en el bucket a una fila borrada apuntando
 * a un objeto que la transacción todavía podría revertir.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const imageId = parseImageId((await params).imageId);
  if (imageId === null) {
    return NextResponse.json({ error: "ID de imagen inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const removed = await withTransaction(async (client) => {
      const result = await removePortfolioProjectImage(imageId, client);
      if (!result) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.image.delete",
        entityType: "portfolio_image",
        entityId: imageId,
        ip,
      });

      return result;
    });

    if (!removed) {
      return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404 });
    }

    await deletePortfolioImageFiles(removed.storageKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Portfolio Image Error]", error);
    return NextResponse.json({ error: "Error al eliminar la imagen." }, { status: 500 });
  }
}
