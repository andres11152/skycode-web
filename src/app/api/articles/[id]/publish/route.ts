import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { approveAndPublish } from "@/lib/queries/articles";
import { revalidateArticlePaths } from "@/lib/revalidateArticle";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/[id]/publish - review -> published. Requiere
 * `content:write` (en la práctica, solo admin — ver rbac.ts). Es el paso
 * que hace visible el artículo en el sitio público: revalida sus rutas de
 * inmediato (no espera al fallback de una hora) y avisa a IndexNow, la
 * "compuerta humana" que el plan de SEO (Fase 3) exigía entre generación
 * automática y publicación real.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "content:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const articleId = Number((await params).id);
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return NextResponse.json({ error: "ID de artículo inválido." }, { status: 400 });
  }

  try {
    const result = await approveAndPublish(articleId, session.id);
    if (!result) {
      return NextResponse.json({ error: "Artículo no encontrado, o no está en revisión." }, { status: 404 });
    }

    const ip = getClientIp(request);
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.publish",
      entityType: "article",
      entityId: articleId,
      diff: { after: result },
      ip,
    });

    revalidateArticlePaths(result, true);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Article Publish Error]", error);
    return NextResponse.json({ error: "Error al publicar el artículo." }, { status: 500 });
  }
}
