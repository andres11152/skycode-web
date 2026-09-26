import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { fetchSearchAnalyticsSafe } from "@/lib/googleSearchConsole";
import { upsertGscMetrics } from "@/lib/queries/seoMetrics";
import { logError } from "@/lib/logger";

/**
 * POST /api/cron/seo-pulse - Ingiere la Search Analytics API de Google
 * Search Console (clics/impresiones/CTR/posición por página+query+fecha)
 * hacia `gsc_metrics`, consumida por `/dashboard/seo`. Pensado para un
 * Render Cron Job diario — mismo patrón de secreto compartido que
 * `/api/cron/check-notifications` (reutiliza el mismo `CRON_SECRET`, es la
 * misma frontera de confianza: infraestructura, no una persona logueada).
 *
 * Ventana de 5 días (hoy incluido) en cada corrida, no solo "ayer": los
 * datos de Search Console llegan con 1-3 días de retraso y pueden
 * revisarse después de publicados — una ventana móvil con upsert
 * idempotente (ver `upsertGscMetrics`, `ON CONFLICT` sobre fecha+página+query)
 * captura esas correcciones sin duplicar filas ni necesitar lógica de
 * "reintentar solo lo que falló".
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  if (!process.env.GSC_SITE_URL || !process.env.GSC_SERVICE_ACCOUNT_EMAIL || !process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "GSC_SITE_URL / GSC_SERVICE_ACCOUNT_EMAIL / GSC_SERVICE_ACCOUNT_PRIVATE_KEY no configuradas. Ver .env.example." },
      { status: 503 }
    );
  }

  const WINDOW_DAYS = 5;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - WINDOW_DAYS);

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  let upserted = 0;
  try {
    const rows = await fetchSearchAnalyticsSafe(toIsoDate(startDate), toIsoDate(endDate));
    upserted = await upsertGscMetrics(rows);
  } catch (error) {
    logError("❌ [Cron SEO Pulse] falló", error);
    return NextResponse.json({ success: false, error: "Fallo al ingerir métricas de Search Console." }, { status: 500 });
  }

  return NextResponse.json({ success: true, rowsUpserted: upserted });
}
