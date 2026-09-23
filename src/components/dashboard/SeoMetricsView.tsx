import { Search, MousePointerClick, Eye, Target, Lightbulb, Clock } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { SeoPageRow, SeoQueryRow, SeoSummary } from "@/lib/queries/seoMetrics";

const LOCALE_LABELS: Record<string, string> = { es: "ES", en: "EN", fr: "FR" };

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatPosition(n: number): string {
  return n.toFixed(1);
}

interface Props {
  hasData: boolean;
  /** Solo relevante cuando `hasData` es `false` — si las 3 variables de GSC están presentes en el servidor, el cron sí puede correr; 0 filas ahí es "todavía sin datos de Google", no "mal configurado". */
  gscConfigured?: boolean;
  summary: SeoSummary | null;
  topQueries: SeoQueryRow[];
  contentGaps: SeoQueryRow[];
  topPages: SeoPageRow[];
  windowDays: number;
}

export function SeoMetricsView({ hasData, gscConfigured = false, summary, topQueries, contentGaps, topPages, windowDays }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">SEO</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Métricas de Google Search Console de los últimos {windowDays} días — ingeridas por el cron diario
          <code className="mx-1 font-mono text-foreground/60">seo-pulse</code>
        </p>
      </div>

      {!hasData || !summary ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          {gscConfigured ? (
            <EmptyState
              icon={Clock}
              title="Cron configurado, esperando datos de Google"
              description="Las credenciales de Search Console están puestas y el cron POST /api/cron/seo-pulse corre sin error, pero todavía no hay ninguna fila cargada. Es normal en una propiedad recién verificada — Google tarda unos días en empezar a reportar impresiones reales. Revisa de nuevo en 3-5 días; si sigue vacío después de eso, ahí sí conviene revisar las credenciales."
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Sin datos de Search Console todavía"
              description="El cron POST /api/cron/seo-pulse no puede correr porque faltan variables de entorno. Configura GSC_SITE_URL, GSC_SERVICE_ACCOUNT_EMAIL y GSC_SERVICE_ACCOUNT_PRIVATE_KEY (ver .env.example), agrega la cuenta de servicio como usuario en Search Console, y programa el cron en el hosting."
            />
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>Clics</span>
                <MousePointerClick size={18} className="text-accent" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{summary.totalClicks.toLocaleString("es")}</div>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>Impresiones</span>
                <Eye size={18} className="text-accent" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{summary.totalImpressions.toLocaleString("es")}</div>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>CTR promedio</span>
                <Target size={18} className="text-green-700" />
              </div>
              <div className="text-2xl font-bold font-mono text-green-700">{formatPct(summary.avgCtr)}</div>
            </div>
            <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>Posición promedio</span>
                <Search size={18} className="text-amber-700" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">{formatPosition(summary.avgPosition)}</div>
            </div>
          </div>

          <section aria-label="Oportunidades de contenido">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-foreground">Oportunidades de contenido</h2>
            </div>
            <p className="mb-3 text-xs text-foreground/60">
              Queries con impresiones pero cero clics, en posición 4-30 — las más baratas de mover con una pieza de
              contenido nueva o un ajuste de metadata.
            </p>
            {contentGaps.length === 0 ? (
              <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
                <EmptyState icon={Lightbulb} title="Sin oportunidades claras" description="No hay queries con impresiones y cero clics en el rango 4-30 en esta ventana." />
              </div>
            ) : (
              <QueryTable rows={contentGaps} caption="Queries con impresiones sin clics en posición 4-30" />
            )}
          </section>

          <section aria-label="Queries con más impresiones">
            <h2 className="mb-3 text-sm font-bold text-foreground">Queries con más impresiones</h2>
            <QueryTable rows={topQueries} caption="Queries ordenadas por impresiones totales" />
          </section>

          <section aria-label="Páginas con más clics">
            <h2 className="mb-3 text-sm font-bold text-foreground">Páginas con más clics</h2>
            {topPages.length === 0 ? (
              <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
                <EmptyState icon={Search} title="Sin páginas con clics" description="Ninguna página tuvo clics en esta ventana." />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground/90">
                    <caption className="sr-only">Páginas ordenadas por clics totales</caption>
                    <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Página</th>
                        <th scope="col" className="px-5 py-3.5">Idioma</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Clics</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Impresiones</th>
                        <th scope="col" className="px-5 py-3.5 text-right">CTR</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Posición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {topPages.map((row) => (
                        <tr key={row.page}>
                          <td className="px-5 py-3 text-foreground break-all">{row.page}</td>
                          <td className="px-5 py-3 text-foreground/60 font-mono">{LOCALE_LABELS[row.locale] ?? row.locale}</td>
                          <td className="px-5 py-3 text-right font-mono text-foreground">{row.clicks}</td>
                          <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.impressions}</td>
                          <td className="px-5 py-3 text-right font-mono text-foreground/70">{formatPct(row.ctr)}</td>
                          <td className="px-5 py-3 text-right font-mono text-foreground/70">{formatPosition(row.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function QueryTable({ rows, caption }: { rows: SeoQueryRow[]; caption: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-foreground/90">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
            <tr>
              <th scope="col" className="px-5 py-3.5">Query</th>
              <th scope="col" className="px-5 py-3.5 text-right">Clics</th>
              <th scope="col" className="px-5 py-3.5 text-right">Impresiones</th>
              <th scope="col" className="px-5 py-3.5 text-right">CTR</th>
              <th scope="col" className="px-5 py-3.5 text-right">Posición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {rows.map((row) => (
              <tr key={row.query}>
                <td className="px-5 py-3 text-foreground">{row.query}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground">{row.clicks}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.impressions}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{formatPct(row.ctr)}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{formatPosition(row.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
