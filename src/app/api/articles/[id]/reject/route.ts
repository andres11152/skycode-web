import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { rejectArticle } from "@/lib/queries/articles";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const RejectSchema = z.object({ reason: z.string().trim().min(1).max(1000) });

/** POST /api/articles/[id]/reject - review -> draft, con motivo. Requiere `content:write`. */
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

  const parsed = RejectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta el motivo del rechazo." }, { status: 400 });
  }

  try {
    const rejected = await rejectArticle(articleId, parsed.data.reason);
    if (!rejected) {
      return NextResponse.json({ error: "Artículo no encontrado, o no está en revisión." }, { status: 404 });
    }

    const ip = getClientIp(request);
    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "article.reject",
      entityType: "article",
      entityId: articleId,
      diff: { reason: parsed.data.reason },
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API POST Article Reject Error]", error);
    return NextResponse.json({ error: "Error al rechazar el artículo." }, { status: 500 });
  }
}
