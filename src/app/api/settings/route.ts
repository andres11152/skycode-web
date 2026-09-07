import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/withAuth";
import { withTransaction } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getSettings, updateSettings } from "@/lib/queries/settings";
import { logError } from "@/lib/logger";

const UpdateSettingsSchema = z
  .object({
    default_tax_rate_pct: z.number().min(0).max(100).optional(),
    invoice_number_prefix: z.string().trim().min(1).max(20).optional(),
    sla_hours_urgente: z.number().int().positive().max(8760).optional(),
    sla_hours_alta: z.number().int().positive().max(8760).optional(),
    sla_hours_media: z.number().int().positive().max(8760).optional(),
    sla_hours_baja: z.number().int().positive().max(8760).optional(),
    manual_usd_to_cop_rate: z.number().positive().max(100_000).nullable().optional(),
  })
  .strict();

/**
 * GET /api/settings - Configuración global de la agencia (SLA por
 * defecto, tasa de impuesto por defecto, prefijo de facturación, tasa de
 * cambio manual). Requiere `settings:write` — no hay `settings:read`
 * separado, solo admin necesita ver esto alguna vez.
 */
export const GET = withAuth("settings:write", async () => {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    logError("❌ [API GET Settings Error]", error);
    return NextResponse.json({ error: "Error al obtener la configuración." }, { status: 500 });
  }
});

/**
 * PATCH /api/settings - Actualiza uno o más campos de configuración.
 * `invoice_next_number` no es editable acá (ver lib/queries/settings.ts).
 * Requiere `settings:write`.
 */
export const PATCH = withAuth("settings:write", async (request, { session }) => {
  try {
    const parsed = UpdateSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de configuración inválidos." }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No se envió ningún campo para actualizar." }, { status: 400 });
    }

    const before = await getSettings();
    const ip = getClientIp(request);

    const settings = await withTransaction(async (client) => {
      const updated = await updateSettings(parsed.data, session.id, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "settings.update",
        entityType: "settings",
        entityId: 1,
        diff: { before, after: updated },
        ip,
      });

      return updated;
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    logError("❌ [API PATCH Settings Error]", error);
    return NextResponse.json({ error: "Error al actualizar la configuración." }, { status: 500 });
  }
});
