import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { exportClientData } from "@/lib/queries/dataPrivacy";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]/export - Descarga un JSON con todo lo que la
 * agencia tiene sobre un cliente (derecho de portabilidad, Ley 1581/RGPD)
 * — proyectos, sprints, tareas, facturas, pagos, metadata de documentos,
 * tickets, retainers, checklist de onboarding, propuestas y leads
 * asociados por email. Exclusivo de `data_privacy:manage` (admin) — es
 * la misma clase de decisión que auditoría o SEO: un manejo legal/
 * estratégico, no un módulo operativo delegable a sales_manager.
 * Auditado (`client.export`) para poder demostrar cumplimiento ante una
 * autoridad de protección de datos si hace falta.
 */
export async function GET(request: Request, { params }: RouteContext) {
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
    const data = await exportClientData(clientId);
    if (!data) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "client.export",
      entityType: "client",
      entityId: clientId,
      ip: getClientIp(request),
    });

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cliente-${clientId}-datos.json"`,
      },
    });
  } catch (error) {
    logError("❌ [API GET Client Export Error]", error);
    return NextResponse.json({ error: "Error al exportar los datos del cliente." }, { status: 500 });
  }
}
