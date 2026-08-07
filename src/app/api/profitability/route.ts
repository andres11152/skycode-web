import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { getProjectProfitability, getCampaignProfitability } from "@/lib/queries/profitability";

/**
 * GET /api/profitability - Cotizado vs. costo real de horas vs. facturado
 * por proyecto, y margen neto (facturado - costo - inversión) por canal.
 * Requiere profitability:read (solo admin) — es el único reporte que
 * cruza costos de horas de todo el equipo con inversión publicitaria.
 */
export const GET = withAuth("profitability:read", async () => {
  try {
    const [projects, campaigns] = await Promise.all([getProjectProfitability(), getCampaignProfitability()]);
    return NextResponse.json({ success: true, projects, campaigns });
  } catch (error) {
    console.error("❌ [API GET Profitability Error]", error);
    return NextResponse.json({ error: "Error al obtener el reporte de rentabilidad." }, { status: 500 });
  }
});
