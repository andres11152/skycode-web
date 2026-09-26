import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { setPortfolioProjectCoverImage } from "@/lib/queries/portfolio";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const CoverSchema = z.object({ imageId: z.number().int().positive().nullable() });

/** PATCH /api/portfolio/projects/[id]/cover - Elige (o quita, con `imageId: null`) la imagen de portada. Requiere `portfolio:write`. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const projectId = parseProjectId((await params).id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  try {
    const parsed = CoverSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "imageId inválido." }, { status: 400 });
    }

    await withTransaction((client) => setPortfolioProjectCoverImage(projectId, parsed.data.imageId, client));
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Project Cover Error]", error);
    return NextResponse.json({ error: "Error al elegir la portada." }, { status: 500 });
  }
}
