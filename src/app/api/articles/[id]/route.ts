import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { deleteArticle, updateArticleContent } from "@/lib/queries/articles";
import { revalidateArticlePaths } from "@/lib/revalidateArticle";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseArticleId(id: string): number | null {
  const articleId = Number(id);
  return Number.isInteger(articleId) && articleId > 0 ? articleId : null;
}

const BlogBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: z.string() }),
  z.object({ type: z.literal("list"), items: z.array(z.string()) }),
  z.object({ type: z.literal("code"), language: z.string(), code: z.string() }),
]);

const UpdateArticleSchema = z.object({
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "El slug solo admite minúsculas, números y guiones."),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(200),
  authorSlug: z.string().trim().max(100),
  tags: z.array(z.string().trim().min(1)).max(10),
  content: z.array(BlogBlockSchema).max(200),
});

/** PATCH /api/articles/[id] - Edita el contenido de un borrador o artículo en revisión. Requiere `content:write`. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "content:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const articleId = parseArticleId((await params).id);
  if (articleId === null) {
    return NextResponse.json({ error: "ID de artículo inválido." }, { status: 400 });
  }

  const parsed = UpdateArticleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de artículo inválidos." }, { status: 400 });
  }

  try {
    const updated = await updateArticleContent(articleId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Artículo no encontrado, o ya está publicado (no editable acá)." }, { status: 404 });
    }

    const ip = getClientIp(request);
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.update",
      entityType: "article",
      entityId: articleId,
      diff: { after: parsed.data },
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Article Error]", error);
    return NextResponse.json({ error: "Error al guardar el artículo." }, { status: 500 });
  }
}

/** DELETE /api/articles/[id] - Borrado lógico. Si estaba publicado, revalida sus rutas públicas de inmediato. Requiere `content:write`. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "content:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const articleId = parseArticleId((await params).id);
  if (articleId === null) {
    return NextResponse.json({ error: "ID de artículo inválido." }, { status: 400 });
  }

  try {
    const result = await deleteArticle(articleId);
    if (!result) {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }

    const ip = getClientIp(request);
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.delete",
      entityType: "article",
      entityId: articleId,
      ip,
    });

    if (result.wasPublished) revalidateArticlePaths({ slug: result.slug, locale: result.locale });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Article Error]", error);
    return NextResponse.json({ error: "Error al eliminar el artículo." }, { status: 500 });
  }
}
