import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSessionOrRedirect } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { getContentGaps, getSeoSummary, getTopPages, getTopQueries, hasAnyGscData } from "@/lib/queries/seoMetrics";
import { SeoMetricsView } from "@/components/dashboard/SeoMetricsView";

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

export default async function DashboardSeoPage() {
  const session = await requireSessionOrRedirect();
  if (!hasPermission(session.role, "seo:read")) redirect("/dashboard");

  const hasData = await hasAnyGscData();
  if (!hasData) {
    return <SeoMetricsView hasData={false} summary={null} topQueries={[]} contentGaps={[]} topPages={[]} windowDays={WINDOW_DAYS} />;
  }

  const [summary, topQueries, contentGaps, topPages] = await Promise.all([
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
    />
  );
}
