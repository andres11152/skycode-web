import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getRetainers, createRetainer } from "@/lib/queries/retainers";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const CreateRetainerSchema = z.object({
  project_id: z.number().int().positive(),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
  billing_day: z.number().int().min(1).max(28),
  next_invoice_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
});

/**
 * GET /api/retainers - Lista de retainers activos e inactivos. Mismo
 * permiso que Facturación (`invoices:read`) — un retainer es, en el
 * fondo, una configuración de facturación recurrente.
 */
export const GET = withAuth("invoices:read", async () => {
  try {
    const retainers = await getRetainers();
    return NextResponse.json({ success: true, retainers });
  } catch (error) {
    logError("❌ [API GET Retainers Error]", error);
    return NextResponse.json({ error: "Error al obtener los retainers." }, { status: 500 });
  }
});

/**
 * POST /api/retainers - Crea un retainer. Mismo permiso que Facturación
 * (`invoices:write`, solo admin) — decidir cobrar recurrente es la misma
 * clase de decisión que emitir una factura puntual.
 */
export const POST = withAuth("invoices:write", async (request, { session }) => {
  const parsed = CreateRetainerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const id = await withTransaction(async (client) => {
      const retainerId = await createRetainer(parsed.data, session.id, client);
      if (retainerId === null) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "retainer.create",
        entityType: "retainer",
        entityId: retainerId,
        diff: { after: parsed.data },
        ip,
      });

      return retainerId;
    });

    if (id === null) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 400 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logError("❌ [API POST Retainers Error]", error);
    return NextResponse.json({ error: "Error al crear el retainer." }, { status: 500 });
  }
});
