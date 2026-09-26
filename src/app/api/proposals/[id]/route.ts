import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { getProposalById, markProposalViewed } from "@/lib/queries/proposals";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const IdSchema = z.uuid();

/**
 * GET /api/proposals/[id] - Vista pública de una propuesta por su UUID
 * (que es el mismo enlace, sin token separado). Sin autenticación: el
 * cliente nunca tuvo cuenta. Marca `viewed_at` la primera vez que se abre,
 * sin tocarlo en visitas posteriores.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`proposal-view:${ip}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const { id } = await params;
    if (!IdSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }

    let proposal = await getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }

    if (!proposal.viewed_at) {
      await markProposalViewed(id);
      // Sin esto, la respuesta de esta primerísima vista quedaría con el
      // `proposal` ya obsoleto (status "sent" en vez de "viewed") aunque la
      // base ya tenga `viewed_at` — un bug real encontrado por el test E2E
      // de este flujo, no una precaución teórica.
      proposal = await getProposalById(id);
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    logError("❌ [API GET Public Proposal Error]", error);
    return NextResponse.json({ error: "Error al obtener la propuesta." }, { status: 500 });
  }
}

