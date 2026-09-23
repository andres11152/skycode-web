import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { createArticleDraft } from "@/lib/queries/articles";
import { logError } from "@/lib/logger";

/**
 * POST /api/articles - Crea un borrador vacío en español, listo para
 * editar desde /dashboard/contenido/[id]. Requiere `content:write`. El
 * slug placeholder (`nuevo-articulo-<timestamp>`) es editable de inmediato
 * en el editor — nada público depende de él todavía, el artículo nace en
 * `draft`.
 */
export const POST = withAuth("content:write", async (request, { session }) => {
  try {
    const ip = getClientIp(request);
    const placeholderSlug = `nuevo-articulo-${Date.now()}`;

    const id = await createArticleDraft(
      {
        slug: placeholderSlug,
        locale: "es",
        title: "",
        description: "",
        author: session.name,
        authorSlug: "",
        tags: [],
        content: [],
      },
      session.id
    );

    // No va en la misma transacción que el INSERT de arriba (a diferencia
    // del patrón de expenses/route.ts) — aceptable acá: crear un borrador
    // vacío no tiene ningún efecto que revertir si el log fallara.
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.create",
      entityType: "article",
      entityId: id,
      ip,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logError("❌ [API POST Articles Error]", error);
    return NextResponse.json({ error: "Error al crear el artículo." }, { status: 500 });
  }
});
