import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { upsertPortfolioTranslation } from "@/lib/queries/portfolio";
import { logError } from "@/lib/logger";
import type { Locale } from "@/lib/i18n";

interface RouteContext {
  params: Promise<{ id: string; locale: string }>;
}

function parseProjectId(id: string): number | null {
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

const VALID_LOCALES: Locale[] = ["es", "en", "fr"];

const TranslationSchema = z.object({
  title: z.string().trim().max(300),
  clientLabel: z.string().trim().max(300),
  summary: z.string().trim().max(1000),
  challenge: z.string().trim().max(3000),
  solution: z.string().trim().max(3000),
  results: z.string().trim().max(3000),
  capabilities: z.array(z.string().trim().max(100)).max(12),
});

/**
 * PATCH /api/portfolio/projects/[id]/translations/[locale] - Guarda (crea
 * o reemplaza) el bloque completo de un idioma. Requiere `portfolio:write`.
 * El editor manda SIEMPRE el objeto entero del idioma que se está editando
 * (mismo criterio que `upsertPortfolioTranslation()`), nunca campos sueltos
 * — evita el caso "guardé el título pero el resumen quedó a medio
 * escribir en otra pestaña" por un PATCH parcial fuera de orden.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "portfolio:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const { id, locale } = await params;
  const projectId = parseProjectId(id);
  if (projectId === null) {
    return NextResponse.json({ error: "ID de proyecto inválido." }, { status: 400 });
  }
  if (!VALID_LOCALES.includes(locale as Locale)) {
    return NextResponse.json({ error: "Idioma inválido." }, { status: 400 });
  }

  try {
    const parsed = TranslationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de traducción inválidos." }, { status: 400 });
    }

    const ip = getClientIp(request);
    await withTransaction(async (client) => {
      await upsertPortfolioTranslation(projectId, locale as Locale, parsed.data, client);
      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "portfolio.project.translation_update",
        entityType: "portfolio_project",
        entityId: projectId,
        diff: { after: { locale, ...parsed.data } },
        ip,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API PATCH Portfolio Translation Error]", error);
    return NextResponse.json({ error: "Error al guardar la traducción." }, { status: 500 });
  }
}
