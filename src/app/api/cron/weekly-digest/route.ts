import { NextResponse } from "next/server";
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
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-cron-secret")?.trim();
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const recipientCount = await sendWeeklyDigest();
    return NextResponse.json({ success: true, recipientCount });
  } catch (error) {
    logError("❌ [Cron Weekly Digest] falló", error);
    return NextResponse.json({ error: "Error al generar el resumen semanal." }, { status: 500 });
  }
}
