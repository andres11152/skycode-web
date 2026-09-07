import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { getAuditLogPage } from "@/lib/queries/audit";
import { logError } from "@/lib/logger";

const QuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  action: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

const PAGE_SIZE = 20;

/**
 * GET /api/audit - Bitácora de cambios (lead.update, project.delete,
 * user.login, etc.), con quién, cuándo y el contenido anterior/nuevo.
 * Requiere permiso audit:read (solo admin). Paginada en SQL — ver
 * lib/queries/audit.ts::getAuditLogPage.
 */
export const GET = withAuth("audit:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros de consulta inválidos." }, { status: 400 });
    }

    const { entries, total, actions } = await getAuditLogPage({
      q: parsed.data.q || "",
      action: parsed.data.action || "ALL",
      page: parsed.data.page || 1,
      pageSize: PAGE_SIZE,
    });

    return NextResponse.json({ success: true, entries, total, actions });
  } catch (error) {
    logError("❌ [API GET Audit Error]", error);
    return NextResponse.json({ error: "Error al obtener la bitácora." }, { status: 500 });
  }
});
