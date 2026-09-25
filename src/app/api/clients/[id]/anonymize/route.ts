import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { anonymizeClient } from "@/lib/queries/dataPrivacy";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/clients/[id]/anonymize - Ejerce el derecho al olvido sobre un
 * cliente: reemplaza nombre/email/teléfono/empresa/notas por valores
 * genéricos (ver lib/queries/dataPrivacy.ts y el comentario de la
 * migración 0029 sobre por qué NO es un DELETE físico). Irreversible —
 * no hay endpoint para deshacerlo, mismo criterio que borrar una sesión
 * ajena o desactivar un usuario. Exclusivo de `data_privacy:manage`
 * (admin). Auditado (`client.anonymize`) antes de que el propio actor
 * quede anonimizado en cualquier registro relacionado.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "data_privacy:manage")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const clientId = Number((await params).id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "ID de cliente inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const result = await withTransaction(async (client) => {
      const outcome = await anonymizeClient(clientId, client);

      if (outcome.outcome === "ok") {
        await logAudit(client.query.bind(client), {
          actorId: session.id,
          actorEmail: session.email,
          action: "client.anonymize",
          entityType: "client",
          entityId: clientId,
          ip,
        });
      }

      return outcome;
    });

    switch (result.outcome) {
      case "ok":
        return NextResponse.json({ success: true });
      case "not_found":
        return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
      case "already_anonymized":
        return NextResponse.json({ error: "Este cliente ya fue anonimizado." }, { status: 409 });
    }
  } catch (error) {
    logError("❌ [API POST Client Anonymize Error]", error);
    return NextResponse.json({ error: "Error al anonimizar el cliente." }, { status: 500 });
  }
}
