import { NextResponse } from "next/server";
import { requireSession } from "@/lib/withAuth";
import { getUsdToCopRate } from "@/lib/exchangeRate";

/**
 * GET /api/exchange-rate - Tasa USD→COP vigente (dinámica, ver
 * lib/currency.ts). Cualquier rol interno autenticado la puede leer — no
 * es información sensible, solo un dato de referencia para formularios
 * que crean montos en USD.
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  if (auth.session.role === "client") {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  try {
    const rate = await getUsdToCopRate();
    return NextResponse.json({ success: true, usdToCopRate: rate });
  } catch (error) {
    console.error("❌ [API GET Exchange Rate Error]", error);
    return NextResponse.json({ error: "Error al obtener la tasa de cambio." }, { status: 500 });
  }
}
