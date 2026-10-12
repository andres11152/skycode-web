import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getContentGaps, getSeoSummary, getTopPages, getTopQueries, hasAnyGscData } from "@/lib/queries/seoMetrics";
import { SeoMetricsView } from "@/components/dashboard/SeoMetricsView";
import { SeoHealthPanel } from "@/components/dashboard/SeoHealthPanel";
import { getLatestSeoHealthRun, getSeoHealthHistory } from "@/lib/queries/seoHealth";
import { SeoInsightsPanel, type SeoInsights } from "@/components/dashboard/SeoInsightsPanel";
import { getOpenSeoAlerts, getPeriodRows, loadSeoWindows } from "@/lib/queries/seoAnalysis";
import { compareByQuery, findCannibalization, findStrikingDistance, findWrongTarget, segmentTotals } from "@/lib/seoAnalysis";
import { listKeywordEntries } from "@/seo/keyword-map";

export const metadata: Metadata = {
  title: "SEO | SKYCODE Agency",
  robots: { index: false, follow: false },
};

// Ventana fija de 28 días (4 semanas completas) — suficiente para
// suavizar el ruido día a día de un sitio con tráfico todavía bajo, sin
// pasarse el rango de 3 meses que suele ofrecer Search Console de forma
// gratuita. Si se necesita un selector de rango, este es el único número
// que habría que parametrizar.
const WINDOW_DAYS = 28;
const TOP_LIMIT = 15;

/** `YYYY-MM-DD` menos `days` días (calendario, sin hora). */
function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Todo lo que pinta `SeoInsightsPanel`, calculado en el servidor con las funciones puras de lib/seoAnalysis.ts. */
async function loadInsights(): Promise<SeoInsights | null> {
  const windows = await loadSeoWindows();
  if (!windows) return null;
  const [alerts, monthRows] = await Promise.all([getOpenSeoAlerts(), getPeriodRows(minusDays(windows.latestDate, WINDOW_DAYS - 1), windows.latestDate)]);
  const entries = listKeywordEntries();
  return {
    latestDate: windows.latestDate,
    currentRange: `${windows.current.from} a ${windows.current.to}`,
    previousRange: `${windows.previous.from} a ${windows.previous.to}`,
    windowDays: WINDOW_DAYS,
    alerts,
    segments: segmentTotals(monthRows),
    striking: findStrikingDistance(monthRows).slice(0, TOP_LIMIT),
    cannibalization: findCannibalization(windows.current.rows).slice(0, TOP_LIMIT),
    wrongTarget: findWrongTarget(windows.current.rows, entries).slice(0, TOP_LIMIT),
    movers: compareByQuery(windows.current.rows, windows.previous.rows).slice(0, TOP_LIMIT),
  };
}

export default async function DashboardSeoPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "seo:read")) redirect("/dashboard");

  const [healthRun, healthHistory] = await Promise.all([getLatestSeoHealthRun(), getSeoHealthHistory()]);
  const healthSlot = <SeoHealthPanel run={healthRun} history={healthHistory} />;

  const hasData = await hasAnyGscData();
  if (!hasData) {
    // Distingue "el cron nunca pudo correr porque faltan variables" de
    // "está bien configurado pero Google todavía no acumuló impresiones"
    // — antes el estado vacío siempre decía "configura las variables",
    // aunque ya estuvieran puestas y el cron corriera bien (una propiedad
    // recién verificada en Search Console tarda días en mostrar datos,
    // ver CLAUDE.md). El chequeo es solo de presencia de las variables,
    // no valida que las credenciales sean correctas — si lo están pero el
    // cron sigue sin cargar filas después de varios días, ahí sí hay que
    // revisar la configuración real.
    const gscConfigured = Boolean(
      process.env.GSC_SITE_URL && process.env.GSC_SERVICE_ACCOUNT_EMAIL && process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    return (
      <SeoMetricsView
        hasData={false}
        gscConfigured={gscConfigured}
        summary={null}
        topQueries={[]}
        contentGaps={[]}
        topPages={[]}
        windowDays={WINDOW_DAYS}
        healthSlot={healthSlot}
      />
    );
  }

  const [insights, summary, topQueries, contentGaps, topPages] = await Promise.all([
    loadInsights(),
    getSeoSummary(WINDOW_DAYS),
    getTopQueries(WINDOW_DAYS, TOP_LIMIT),
    getContentGaps(WINDOW_DAYS, TOP_LIMIT),
    getTopPages(WINDOW_DAYS, TOP_LIMIT),
  ]);

  return (
    <SeoMetricsView
      hasData
      summary={summary}
      topQueries={topQueries}
      contentGaps={contentGaps}
      topPages={topPages}
      windowDays={WINDOW_DAYS}
      healthSlot={healthSlot}
      insightsSlot={<SeoInsightsPanel insights={insights} />}
    />
  );
}
