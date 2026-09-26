import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { sendWeeklyDigest } from "@/lib/queries/weeklyDigest";
import { logError } from "@/lib/logger";

/**
 * POST /api/cron/weekly-digest - Envía el resumen semanal (leads nuevos,
 * propuestas pendientes, facturas vencidas, SLA en riesgo) a cada usuario
 * activo `admin`/`sales_manager`. Pensado para un Render Cron Job semanal
 * (ej. lunes 8am) — mismo patrón de `x-cron-secret` que
 * `check-notifications`/`seo-pulse`/`content-pulse`: sin sesión de
 * usuario (quien llama es infraestructura), y sin `CRON_SECRET`
 * configurado la ruta se niega a correr en vez de quedar abierta.
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const recipientCount = await sendWeeklyDigest();
    return NextResponse.json({ success: true, recipientCount });
  } catch (error) {
    logError("❌ [Cron Weekly Digest] falló", error);
    return NextResponse.json({ error: "Error al generar el resumen semanal." }, { status: 500 });
  }
}
