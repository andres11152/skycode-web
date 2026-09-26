import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction, query } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { setPortfolioProjectStatus } from "@/lib/queries/portfolio";
import { revalidatePortfolioPaths } from "@/lib/revalidatePortfolio";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const StatusSchema = z.object({ status: z.enum(["draft", "published", "archived"]) });

const ERROR_MESSAGES: Record<string, string> = {
  missing_cover_image: "Elige una imagen de portada antes de publicar.",
  missing_spanish_translation: "Completa al menos el título y el resumen en español antes de publicar.",
};

/**
 * PATCH /api/portfolio/projects/[id]/status - Cambia el estado
 * (draft/published/archived). Requiere `portfolio:write`. Ruta separada
 * de `PATCH /api/portfolio/projects/[id]` a propósito — publicar dispara
 * validación propia (portada + español completos, ver
 * `setPortfolioProjectStatus()`), no es un campo más del formulario
 * general.
 */
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
    const parsed = StatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const result = await withTransaction(async (client) => {
      const outcome = await setPortfolioProjectStatus(projectId, parsed.data.status, session.id, client);
      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "portfolio.project.status_change",
          entityType: "portfolio_project",
          entityId: projectId,
          diff: { after: { status: parsed.data.status } },
          ip,
        });
      }
      return outcome;
    });

    if (result.outcome === "not_found") {
      return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
    }
    if (result.outcome !== "ok") {
      return NextResponse.json({ error: ERROR_MESSAGES[result.outcome] }, { status: 400 });
    }

    const slugRes = await query("SELECT slug FROM portfolio_projects WHERE id = $1;", [projectId]);
    if (slugRes.rows[0]) revalidatePortfolioPaths(String(slugRes.rows[0].slug));

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Project Status Error]", error);
    return NextResponse.json({ error: "Error al cambiar el estado del caso." }, { status: 500 });
  }
}
