import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getCampaignSpend, addCampaignSpend } from "@/lib/queries/campaigns";
import { CURRENCIES } from "@/lib/currency";

const CreateSpendSchema = z.object({
  spend_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseCampaignId(id: string): number | null {
  const campaignId = Number(id);
  return Number.isInteger(campaignId) && campaignId > 0 ? campaignId : null;
}

/**
 * GET /api/campaigns/[id]/spend - Inversión diaria registrada para una
 * campaña. Requiere campaigns:read.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (!hasPermission(auth.session.role, "campaigns:read")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const campaignId = parseCampaignId((await params).id);
  if (campaignId === null) {
    return NextResponse.json({ error: "ID de campaña inválido." }, { status: 400 });
  }

  try {
    const entries = await getCampaignSpend(campaignId);
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("❌ [API GET Campaign Spend Error]", error);
    return NextResponse.json({ error: "Error al obtener la inversión." }, { status: 500 });
  }
}

/**
 * POST /api/campaigns/[id]/spend - Registra la inversión de un día.
 * Requiere campaigns:write. Un segundo envío para la misma fecha
 * actualiza el monto en vez de duplicar (UNIQUE campaign_id+spend_date).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  if (!hasPermission(session.role, "campaigns:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const campaignId = parseCampaignId((await params).id);
  if (campaignId === null) {
    return NextResponse.json({ error: "ID de campaña inválido." }, { status: 400 });
  }

  try {
    const parsed = CreateSpendSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de inversión inválidos." }, { status: 400 });
    }
    const { spend_date, amount, currency } = parsed.data;
    const ip = getClientIp(request);

    const entry = await withTransaction(async (client) => {
      const spendEntry = await addCampaignSpend(campaignId, { spend_date, amount, currency }, session.id, client);
      if (!spendEntry) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "campaign.spend",
        entityType: "campaign",
        entityId: campaignId,
        diff: { after: { spend_date, amount } },
        ip,
      });

      return spendEntry;
    });

    if (!entry) {
      return NextResponse.json({ error: "Campaña no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, entry: { ...entry, amount: Number(entry.amount) } });
  } catch (error) {
    console.error("❌ [API POST Campaign Spend Error]", error);
    return NextResponse.json({ error: "Error al registrar la inversión." }, { status: 500 });
  }
}

