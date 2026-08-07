import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { getAllMatchingLeads } from "@/lib/queries/leads";
import { toCsvCell } from "@/lib/utils";

/**
 * GET /api/leads/export - CSV de los leads que calzan el filtro actual
 * (no solo la página visible). Requiere leads:read. Cada exportación queda
 * en `audit_log` con quién la pidió y cuántas filas — es el único
 * mecanismo de este sistema para sacar datos de clientes en bloque, así
 * que conviene poder responder "quién se llevó qué" más adelante.
 */
export const GET = withAuth("leads:read", async (request, { session }) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "ALL";

    const leads = await getAllMatchingLeads({ q, status });

    const headers = [
      "ID", "Nombre", "Email", "Telefono", "Servicio", "Presupuesto", "Moneda",
      "Semanas", "Origen", "Estado", "Dueño", "UTM Source", "UTM Campaign", "Fecha",
    ];
    const rows = leads.map((l) => [
      String(l.id),
      toCsvCell(l.name || ""),
      toCsvCell(l.email || ""),
      toCsvCell(l.phone || ""),
      toCsvCell(l.service || ""),
      toCsvCell(l.budget || ""),
      toCsvCell(l.currency || "COP"),
      String(l.estimated_weeks || 4),
      toCsvCell(l.source || ""),
      toCsvCell(l.status),
      toCsvCell(l.owner?.name || ""),
      toCsvCell(l.utm_source || ""),
      toCsvCell(l.utm_campaign || ""),
      new Date(l.created_at).toISOString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    await logAudit(query, {
      actorId: session.id,
      actorEmail: session.email,
      action: "leads.export",
      entityType: "leads",
      entityId: `${q || "*"}:${status}`,
      diff: { rowCount: leads.length },
      ip: getClientIp(request),
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prospectos_skycode_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("❌ [API GET Leads Export Error]", error);
    return NextResponse.json({ error: "Error al exportar prospectos." }, { status: 500 });
  }
});
