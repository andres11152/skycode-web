import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { updateTechnology, deleteTechnology } from "@/lib/queries/portfolioTechnologies";
import { PORTFOLIO_TECH_CATEGORIES, type PortfolioTechCategory } from "@/content/portfolioShared";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseTechId(id: string): number | null {
  const techId = Number(id);
  return Number.isInteger(techId) && techId > 0 ? techId : null;
}

const UpdateTechnologySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: z.enum(PORTFOLIO_TECH_CATEGORIES as [PortfolioTechCategory, ...PortfolioTechCategory[]]).optional(),
  iconSource: z.enum(["simple-icons", "custom"]).optional(),
  iconRef: z.string().trim().min(1).max(300).optional(),
  websiteUrl: z.string().trim().url().nullable().optional(),
});

/** PATCH /api/portfolio/technologies/[id] - Edita una tecnología del catálogo (nunca el slug, es la clave estable que referencian los proyectos que ya la usan). Requiere `portfolio:write`. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const techId = parseTechId((await params).id);
  if (techId === null) {
    return NextResponse.json({ error: "ID de tecnología inválido." }, { status: 400 });
  }

  try {
    const parsed = UpdateTechnologySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const updated = await withTransaction((client) => updateTechnology(techId, parsed.data, client));
    if (!updated) {
      return NextResponse.json({ error: "Tecnología no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true, technology: updated });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Technology Error]", error);
    return NextResponse.json({ error: "Error al actualizar la tecnología." }, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio/technologies/[id] - Borrado físico (un catálogo
 * de tecnologías no tiene el mismo peso legal/contable que clientes o
 * facturas). Requiere `portfolio:write`. Bloqueado si está en uso por
 * algún caso — devuelve 409 con el conteo, en vez de dejar que el error
 * crudo de `ON DELETE RESTRICT` sea la única señal.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const techId = parseTechId((await params).id);
  if (techId === null) {
    return NextResponse.json({ error: "ID de tecnología inválido." }, { status: 400 });
  }

  try {
    const result = await withTransaction((client) => deleteTechnology(techId, client));
    if (result.outcome === "not_found") {
      return NextResponse.json({ error: "Tecnología no encontrada." }, { status: 404 });
    }
    if (result.outcome === "in_use") {
      return NextResponse.json(
        { error: `No se puede eliminar: está en uso en ${result.projectCount} caso(s) del portafolio.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Portfolio Technology Error]", error);
    return NextResponse.json({ error: "Error al eliminar la tecnología." }, { status: 500 });
  }
}
