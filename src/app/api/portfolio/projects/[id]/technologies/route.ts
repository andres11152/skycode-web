import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { setPortfolioProjectTechnologies } from "@/lib/queries/portfolio";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const TechnologiesSchema = z.object({ technologyIds: z.array(z.number().int().positive()).max(30) });

/** PATCH /api/portfolio/projects/[id]/technologies - Reemplaza el set completo de tecnologías, en el orden dado (el orden del arreglo define `sort_order`). Requiere `portfolio:write`. */
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
    const parsed = TechnologiesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Lista de tecnologías inválida." }, { status: 400 });
    }

    await withTransaction((client) => setPortfolioProjectTechnologies(projectId, parsed.data.technologyIds, client));
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Project Technologies Error]", error);
    return NextResponse.json({ error: "Error al guardar las tecnologías." }, { status: 500 });
  }
}
