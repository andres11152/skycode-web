import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { deleteProposalTemplate } from "@/lib/queries/proposalTemplates";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/proposal-templates/[id] - Borrado lógico de una plantilla.
 * Requiere `proposals:write` — no borra ni afecta ninguna propuesta ya
 * creada a partir de ella (no hay vínculo, ver migración 0025).
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "proposals:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const templateId = Number((await params).id);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "ID de plantilla inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const result = await deleteProposalTemplate(templateId, client);
      if (!result) return false;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "proposal_template.delete",
        entityType: "proposal_template",
        entityId: templateId,
        ip,
      });

      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Proposal Template Error]", error);
    return NextResponse.json({ error: "Error al eliminar la plantilla." }, { status: 500 });
  }
}
