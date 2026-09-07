import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import {
  getCampaignsWithMetrics,
  createCampaign,
  updateCampaign,
  softDeleteCampaign,
} from "@/lib/queries/campaigns";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const ChannelSchema = z.enum(["google_ads", "meta_ads", "linkedin_ads", "organico", "referido", "otro"]);
const CampaignStatusSchema = z.enum(["active", "paused", "ended"]);
const CurrencySchema = z.enum(CURRENCIES as [string, ...string[]]);

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(255),
  channel: ChannelSchema,
  utm_campaign: z.string().trim().max(255).optional(),
  objective: z.string().trim().max(255).optional(),
  budget: z.number().positive().optional(),
  currency: CurrencySchema.optional(),
  starts_at: z.string().trim().max(30).optional(),
  ends_at: z.string().trim().max(30).optional(),
});

const UpdateCampaignSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  budget: z.number().positive().nullable().optional(),
  status: CampaignStatusSchema.optional(),
  starts_at: z.string().trim().max(30).optional(),
  ends_at: z.string().trim().max(30).optional(),
});

/**
 * GET /api/campaigns - Campañas con métricas calculadas (CPL, conversión,
 * sobre-presupuesto). Requiere campaigns:read (admin, sales_manager,
 * traffiker).
 */
export const GET = withAuth("campaigns:read", async () => {
  try {
    const campaigns = await getCampaignsWithMetrics();
    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    logError("❌ [API GET Campaigns Error]", error);
    return NextResponse.json({ error: "Error al obtener campañas." }, { status: 500 });
  }
});

/**
 * POST /api/campaigns - Crea una campaña. Requiere campaigns:write (admin,
 * traffiker).
 */
export const POST = withAuth("campaigns:write", async (request, { session }) => {
  try {
    const parsed = CreateCampaignSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de campaña inválidos." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const campaign = await withTransaction(async (client) => {
      const created = await createCampaign(parsed.data, session.id, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "campaign.create",
        entityType: "campaign",
        entityId: created.id,
        diff: { after: created },
        ip,
      });

      return created;
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    logError("❌ [API POST Campaign Error]", error);
    return NextResponse.json({ error: "Error al crear la campaña." }, { status: 500 });
  }
});

/**
 * PATCH /api/campaigns - Actualiza nombre, presupuesto, fechas o estado.
 * Requiere campaigns:write.
 */
export const PATCH = withAuth("campaigns:write", async (request, { session }) => {
  try {
    const parsed = UpdateCampaignSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de campaña inválidos." }, { status: 400 });
    }
    const { id, ...data } = parsed.data;
    const ip = getClientIp(request);

    const campaign = await withTransaction(async (client) => {
      const result = await updateCampaign(id, data, client);
      if (!result) return null;

      const { before, after } = result;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "campaign.update",
        entityType: "campaign",
        entityId: id,
        diff: { before, after },
        ip,
      });

      return after;
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    logError("❌ [API PATCH Campaign Error]", error);
    return NextResponse.json({ error: "Error al actualizar la campaña." }, { status: 500 });
  }
});

/**
 * DELETE /api/campaigns?id=123 - Borrado lógico. Requiere campaigns:write.
 */
export const DELETE = withAuth("campaigns:write", async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID de campaña inválido." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const row = await softDeleteCampaign(id, client);
      if (!row) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "campaign.delete",
        entityType: "campaign",
        entityId: id,
        diff: { before: row },
        ip,
      });

      return row;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Campaña no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Campaign Error]", error);
    return NextResponse.json({ error: "Error al eliminar la campaña." }, { status: 500 });
  }
});

