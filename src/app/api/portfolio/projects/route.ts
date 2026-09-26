import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAdminPortfolioList, createPortfolioProject } from "@/lib/queries/portfolio";
import { PORTFOLIO_ICON_NAMES } from "@/content/portfolioShared";
import { logError } from "@/lib/logger";

/** GET /api/portfolio/projects - Listado admin, todos los estados. Requiere `portfolio:read`. */
export const GET = withAuth("portfolio:read", async () => {
  try {
    const projects = await getAdminPortfolioList();
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    logError("❌ [API GET Portfolio Projects Error]", error);
    return NextResponse.json({ error: "Error al obtener el portafolio." }, { status: 500 });
  }
});

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const CreateProjectSchema = z.object({
  slug: z.string().trim().min(2).max(200).regex(SLUG_REGEX, "El slug solo puede tener minúsculas, números y guiones."),
  industryIcon: z.enum(PORTFOLIO_ICON_NAMES as [string, ...string[]]),
});

/**
 * POST /api/portfolio/projects - Crea el caso vacío (solo slug + ícono) —
 * el resto (traducciones, imágenes, tecnologías, métricas) se completa en
 * el editor, que se abre de inmediato tras crear. Requiere
 * `portfolio:write`. Empieza siempre en `draft` (default de la columna,
 * ver migración 0034) — nunca se puede crear ya publicado.
 */
export const POST = withAuth("portfolio:write", async (request, { session }) => {
  try {
    const parsed = CreateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const projectId = await withTransaction(async (client) => {
      const id = await createPortfolioProject(parsed.data, session.id, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.project.create",
        entityType: "portfolio_project",
        entityId: id,
        diff: { after: parsed.data },
        ip,
      });
      return id;
    });

    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    // Violación de UNIQUE en `slug` — mensaje claro en vez del error crudo de Postgres.
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe un caso con ese slug." }, { status: 409 });
    }
    logError("❌ [API POST Portfolio Projects Error]", error);
    return NextResponse.json({ error: "Error al crear el caso de portafolio." }, { status: 500 });
  }
});
