import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { getAuditLogEntries } from "@/lib/queries/audit";

const QuerySchema = z.object({
  entityType: z.string().trim().max(50).optional(),
  entityId: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

/**
 * GET /api/audit - Bitácora de cambios (lead.update, project.delete,
 * user.login, etc.), con quién, cuándo y el contenido anterior/nuevo.
 * Requiere permiso audit:read (solo admin).
 */
export const GET = withAuth("audit:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros de consulta inválidos." }, { status: 400 });
    }

    const entries = await getAuditLogEntries(parsed.data);
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("❌ [API GET Audit Error]", error);
    return NextResponse.json({ error: "Error al obtener la bitácora." }, { status: 500 });
  }
});

