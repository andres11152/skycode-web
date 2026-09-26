import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAdminPortfolioDetail, updatePortfolioProjectMeta, softDeletePortfolioProject } from "@/lib/queries/portfolio";
import { PORTFOLIO_ICON_NAMES } from "@/content/portfolioShared";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

/** GET /api/portfolio/projects/[id] - Detalle completo para el editor (las 3 traducciones, imágenes, tecnologías, métricas). Requiere `portfolio:read`. */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "portfolio:read")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const projectId = parseProjectId((await params).id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  try {
    const detail = await getAdminPortfolioDetail(projectId);
    if (!detail) {
      return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: detail });
  } catch (error) {
    logError("❌ [API GET Portfolio Project Error]", error);
    return NextResponse.json({ error: "Error al obtener el caso." }, { status: 500 });
  }
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const UpdateMetaSchema = z.object({
  slug: z.string().trim().min(2).max(200).regex(SLUG_REGEX).optional(),
  liveUrl: z.string().trim().url().nullable().optional(),
  industryIcon: z.enum(PORTFOLIO_ICON_NAMES as [string, ...string[]]).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/** PATCH /api/portfolio/projects/[id] - Edita slug/URL en vivo/ícono/destacado/orden. Requiere `portfolio:write`. Las traducciones, tecnologías, imágenes y métricas tienen sus propias rutas (ver abajo). */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const projectId = parseProjectId((await params).id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  try {
    const parsed = UpdateMetaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const updated = await withTransaction(async (client) => {
      const ok = await updatePortfolioProjectMeta(projectId, parsed.data, session.id, client);
      if (!ok) return false;
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.project.update",
        entityType: "portfolio_project",
        entityId: projectId,
        diff: { after: parsed.data },
        ip,
      });
      return true;
    });

    if (!updated) {
      return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un caso con ese slug." }, { status: 409 });
    }
    logError("❌ [API PATCH Portfolio Project Error]", error);
    return NextResponse.json({ error: "Error al actualizar el caso." }, { status: 500 });
  }
}

/** DELETE /api/portfolio/projects/[id] - Borrado lógico. Requiere `portfolio:write`. Las imágenes/traducciones/tecnologías/métricas quedan intactas (por si se restaura a mano desde la base) — solo deja de aparecer en cualquier listado, público o admin. */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const projectId = parseProjectId((await params).id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const deleted = await withTransaction(async (client) => {
      const ok = await softDeletePortfolioProject(projectId, client);
      if (!ok) return false;
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.project.delete",
        entityType: "portfolio_project",
        entityId: projectId,
        ip,
      });
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Portfolio Project Error]", error);
    return NextResponse.json({ error: "Error al eliminar el caso." }, { status: 500 });
  }
}
