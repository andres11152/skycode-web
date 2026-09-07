import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getAllProposals, getProposalById, createProposal } from "@/lib/queries/proposals";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const CreateProposalSchema = z.object({
  client_email: z.email().trim().max(254),
  client_name: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(5000).optional(),
  currency: z.enum(CURRENCIES as [string, ...string[]]).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  valid_until: z.string().trim().max(30).optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),
        quantity: z.number().int().min(1).max(10000),
        unit_price: z.number().min(0).max(1_000_000_000),
      })
    )
    .min(1, "La propuesta necesita al menos una partida.")
    .max(50),
});

/**
 * GET /api/proposals - Lista propuestas con partidas, totales y estado
 * calculado (sent/viewed/accepted/rejected/expired). Requiere
 * proposals:read (admin, sales_manager).
 */
export const GET = withAuth("proposals:read", async () => {
  try {
    const proposals = await getAllProposals();
    return NextResponse.json({ success: true, proposals });
  } catch (error) {
    logError("❌ [API GET Proposals Error]", error);
    return NextResponse.json({ error: "Error al obtener propuestas." }, { status: 500 });
  }
});

/**
 * POST /api/proposals - Crea una propuesta con sus partidas y devuelve el
 * enlace público (/propuesta/[id], donde id es el UUID mismo — sin token
 * separado). Requiere proposals:write. No crea el cliente todavía: eso
 * pasa solo si la propuesta se acepta (ver /api/proposals/[id]/respond) —
 * una propuesta rechazada no debe dejar un cliente fantasma en `clients`.
 */
export const POST = withAuth("proposals:write", async (request, { session }) => {
  try {
    const parsed = CreateProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de propuesta inválidos." }, { status: 400 });
    }
    const { client_email, client_name, title, items } = parsed.data;
    const ip = getClientIp(request);
    const proposalId = randomUUID();

    await withTransaction(async (client) => {
      await createProposal({ id: proposalId, ...parsed.data }, session.id, client);

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "proposal.create",
        entityType: "proposal",
        entityId: proposalId,
        diff: { after: { client_email, title, itemCount: items.length } },
        ip,
      });
    });

    const proposal = await getProposalById(proposalId);
    const origin = new URL(request.url).origin;
    const proposalUrl = `${origin}/propuesta/${proposalId}`;

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const isDummyKey = !apiKey || apiKey === "your_resend_api_key_here" || !apiKey.startsWith("re_");
    if (!isDummyKey) {
      try {
        const resend = new Resend(apiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || "SKYCODE Web <contact@skycode.agency>";
        await resend.emails.send({
          from: fromAddress,
          to: client_email,
          subject: `Propuesta de SKYCODE Agency: ${title}`,
          text: `Hola ${client_name},\n\n${session.name} te envió una propuesta: "${title}".\n\nVerla y responder:\n${proposalUrl}`,
        });
      } catch (emailErr) {
        logError("⚠️ [Proposal Resend Warning]", emailErr);
      }
    }

    // El enlace se devuelve siempre (quien llama ya tiene proposals:write)
    // como respaldo si el correo no llega.
    return NextResponse.json({ success: true, proposal, proposalUrl });
  } catch (error) {
    logError("❌ [API POST Proposal Error]", error);
    return NextResponse.json({ error: "Error al crear la propuesta." }, { status: 500 });
  }
});

