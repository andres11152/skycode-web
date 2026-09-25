import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { getProposalTemplates, createProposalTemplate } from "@/lib/queries/proposalTemplates";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const CreateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),
        quantity: z.number().int().min(1).max(10000),
        unit_price: z.number().min(0).max(1_000_000_000),
      })
    )
    .min(1, "La plantilla necesita al menos una partida.")
    .max(50),
});

/**
 * GET /api/proposal-templates - Lista plantillas activas, más recientes
 * primero. Mismo permiso que `/api/proposals` — una plantilla es un
 * accesorio del módulo de propuestas, no algo con su propio RBAC.
 */
export const GET = withAuth("proposals:read", async () => {
  try {
    const templates = await getProposalTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    logError("❌ [API GET Proposal Templates Error]", error);
    return NextResponse.json({ error: "Error al obtener las plantillas." }, { status: 500 });
  }
});

/**
 * POST /api/proposal-templates - Guarda las partidas/IVA/moneda actuales
 * del formulario de "Nueva propuesta" como plantilla reutilizable. No crea
 * ninguna propuesta real ni la vincula — ver comentario de la migración
 * 0025.
 */
export const POST = withAuth("proposals:write", async (request, { session }) => {
  const parsed = CreateTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const id = await createProposalTemplate(parsed.data, session.id);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    logError("❌ [API POST Proposal Templates Error]", error);
    return NextResponse.json({ error: "Error al guardar la plantilla." }, { status: 500 });
  }
});
