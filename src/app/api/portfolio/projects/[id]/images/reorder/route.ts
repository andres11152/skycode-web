import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { reorderPortfolioProjectImages } from "@/lib/queries/portfolio";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const ReorderSchema = z.object({ imageIds: z.array(z.number().int().positive()).min(1) });

/** PATCH /api/portfolio/projects/[id]/images/reorder - Reordena la galería completa (arrastrar y soltar en el editor). Requiere `portfolio:write`. */
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
    const parsed = ReorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Lista de imágenes inválida." }, { status: 400 });
    }

    await withTransaction((client) => reorderPortfolioProjectImages(projectId, parsed.data.imageIds, client));
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Images Reorder Error]", error);
    return NextResponse.json({ error: "Error al reordenar las imágenes." }, { status: 500 });
  }
}
