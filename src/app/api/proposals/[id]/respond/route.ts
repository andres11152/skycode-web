import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import {
  getProposalById,
  rejectProposal,
  acceptProposalAndCreateProject,
} from "@/lib/queries/proposals";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const RespondSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

/**
 * POST /api/proposals/[id]/respond - El cliente acepta o rechaza, sin
 * cuenta ni sesión (posesión del enlace UUID es la autorización). Aceptar
 * crea el cliente (upsert por email, mismo patrón que POST /api/projects)
 * y el proyecto con las partidas de la propuesta convertidas en sprints —
 * todo en una transacción: o queda completo o no queda nada.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`proposal-respond:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const { id } = await params;
    const parsed = RespondSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const { action } = parsed.data;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }
    if (proposal.accepted_at || proposal.rejected_at) {
      return NextResponse.json({ error: "Esta propuesta ya fue respondida." }, { status: 400 });
    }
    if (proposal.status === "expired") {
      return NextResponse.json({ error: "Esta propuesta ya expiró." }, { status: 400 });
    }

    if (action === "reject") {
      await withTransaction(async (client) => {
        await rejectProposal(id, client);
        await logAudit(client.query.bind(client), {
          actorId: null,
          actorEmail: proposal.client_email,
          action: "proposal.reject",
          entityType: "proposal",
          entityId: id,
          ip,
        });
      });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const project = await withTransaction(async (client) => {
      const newProject = await acceptProposalAndCreateProject(proposal, client);

      await logAudit(client.query.bind(client), {
        actorId: null,
        actorEmail: proposal.client_email.toLowerCase(),
        action: "proposal.accept",
        entityType: "proposal",
        entityId: id,
        diff: { after: { projectId: newProject.id } },
        ip,
      });

      return newProject;
    });

    return NextResponse.json({ success: true, status: "accepted", projectId: project.id });
  } catch (error) {
    logError("❌ [API POST Proposal Respond Error]", error);
    return NextResponse.json({ error: "Error al procesar la respuesta." }, { status: 500 });
  }
}

