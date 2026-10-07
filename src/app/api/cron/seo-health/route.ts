import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runAndStoreSeoHealth } from "@/lib/queries/seoHealth";
import { logError } from "@/lib/logger";

// Recorrer ~85 URLs con 6 en paralelo tarda de unos segundos a un par de
// minutos si el sitio está lento (justo cuando más importa saberlo).
export const maxDuration = 300;

/**
 * POST /api/cron/seo-health - Auditoría técnica de SEO del sitio publicado:
 * lee /sitemap.xml, pide cada URL y guarda canonical, título, H1, status y
 * TTFB en `seo_health_runs` (se muestra en /dashboard/seo → "Salud técnica").
 * Mismo secreto compartido que el resto de crons. Además de este endpoint
 * propio, `seo-pulse` la ejecuta al terminar, así que un único Render Cron
 * Job diario basta; este existe para programarla aparte o lanzarla a mano.
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const { runId, report } = await runAndStoreSeoHealth();
    return NextResponse.json({ success: true, runId, baseUrl: report.baseUrl, totals: report.totals });
  } catch (error) {
    logError("❌ [Cron SEO Health] falló", error);
    return NextResponse.json({ success: false, error: "Fallo al auditar el sitio." }, { status: 500 });
  }
}
