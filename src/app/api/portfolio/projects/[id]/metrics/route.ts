import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { setPortfolioProjectMetrics } from "@/lib/queries/portfolio";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const MetricSchema = z.object({
  value: z.string().trim().min(1).max(50),
  label: z.record(z.string(), z.string().max(100)).refine(
    (value) => Object.keys(value).every((key) => ["es", "en", "fr"].includes(key)),
    { message: "Las claves de `label` deben ser es/en/fr." }
  ),
});
const MetricsSchema = z.object({ metrics: z.array(MetricSchema).max(6) });

/** PATCH /api/portfolio/projects/[id]/metrics - Reemplaza el set completo de resultados medibles, en el orden dado. Requiere `portfolio:write`. Máximo 6 — una tarjeta de resultados con más que eso deja de leerse como highlights. */
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
    const parsed = MetricsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Lista de métricas inválida." }, { status: 400 });
    }

    await withTransaction((client) => setPortfolioProjectMetrics(projectId, parsed.data.metrics, client));
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Project Metrics Error]", error);
    return NextResponse.json({ error: "Error al guardar las métricas." }, { status: 500 });
  }
}
