import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { submitForReview } from "@/lib/queries/articles";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/articles/[id]/submit - draft -> review. Requiere `content:write`. */
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
    const submitted = await submitForReview(articleId);
    if (!submitted) {
      return NextResponse.json({ error: "Artículo no encontrado, o no está en borrador." }, { status: 404 });
    }

    const ip = getClientIp(request);
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.submit_for_review",
      entityType: "article",
      entityId: articleId,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Article Submit Error]", error);
    return NextResponse.json({ error: "Error al enviar a revisión." }, { status: 500 });
  }
}
