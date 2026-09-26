import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { anonymizeLead } from "@/lib/queries/leads";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/leads/[id]/anonymize - Ejerce el derecho al olvido sobre un
 * prospecto que nunca llegó a ser cliente (formulario de contacto o
 * cotizador) — mismo patrón exacto que POST /api/clients/[id]/anonymize
 * (ver ese archivo y lib/queries/leads.ts::anonymizeLead). Irreversible,
 * sin endpoint para deshacerlo. Exclusivo de `data_privacy:manage`
 * (admin) — anonimizar un lead es una decisión de cumplimiento, no de
 * gestión comercial diaria, mismo criterio que con clientes.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "data_privacy:manage")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const leadId = Number((await params).id);
  if (!Number.isInteger(leadId) || leadId <= 0) {
    return NextResponse.json({ error: "ID de prospecto inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const result = await withTransaction(async (client) => {
      const outcome = await anonymizeLead(leadId, client);

      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "lead.anonymize",
          entityType: "lead",
          entityId: leadId,
          ip,
        });
      }

      return outcome;
    });

    switch (result.outcome) {
      case "ok":
        return NextResponse.json({ success: true });
      case "not_found":
        return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
      case "already_anonymized":
        return NextResponse.json({ error: "Este prospecto ya fue anonimizado." }, { status: 409 });
    }
  } catch (error) {
    logError("❌ [API POST Lead Anonymize Error]", error);
    return NextResponse.json({ error: "Error al anonimizar el prospecto." }, { status: 500 });
  }
}
