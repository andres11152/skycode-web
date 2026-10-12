import { BellRing, Crosshair, GitMerge, TrendingUp } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Badge, type BadgeTone } from "./ui/Badge";
import { StatCard } from "./ui/StatCard";
import type { SeoAlert } from "@/lib/queries/seoAnalysis";
import type { Cannibalization, QueryDelta, StrikingQuery, Totals, WrongTarget } from "@/lib/seoAnalysis";
import { formatDateTime, formatNumber } from "@/lib/utils";

/** Datos ya calculados en el servidor (lib/seoAnalysis.ts): el panel solo los pinta. */
export interface SeoInsights {
  /** Última fecha con datos de Search Console y los rangos de las dos semanas comparadas. */
  latestDate: string;
  currentRange: string;
  previousRange: string;
  windowDays: number;
  alerts: SeoAlert[];
  segments: { brand: Totals; nonBrand: Totals };
  striking: StrikingQuery[];
  cannibalization: Cannibalization[];
  wrongTarget: WrongTarget[];
  movers: QueryDelta[];
}

const SEVERITY: Record<SeoAlert["severity"], { label: string; tone: BadgeTone }> = {
  critical: { label: "Crítica", tone: "danger" },
  warning: { label: "Aviso", tone: "warning" },
  info: { label: "Novedad", tone: "info" },
};

const KIND_LABEL: Record<SeoAlert["kind"], string> = {
  top10_entry: "Entró al top 10",
  page_drop: "Caída de página",
  cannibalization: "Canibalización",
  wrong_target: "Página equivocada",
  url_not_ok: "URL caída",
};

const shortUrl = (url: string) => url.replace(/^https?:\/\/[^/]+/, "") || "/";
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const pos = (n: number) => n.toFixed(1);

function TableShell({ caption, headers, children }: { caption: string; headers: { label: string; right?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
      <div className="overflow-x-auto">
        <table data-keep-table data-sticky-first className="w-full text-left text-xs text-foreground/90">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
            <tr>
              {headers.map((h) => (
                <th key={h.label} scope="col" className={`px-5 py-3.5 ${h.right ? "text-right" : ""}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ icon, title, description }: { icon: typeof BellRing; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}

function SegmentCard({ title, totals }: { title: string; totals: Totals }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background p-4 shadow-sm shadow-black/5">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Clics" value={formatNumber(totals.clicks)} />
        <StatCard label="Impresiones" value={formatNumber(totals.impressions)} />
        <StatCard label="CTR" value={pct(totals.ctr)} />
        <StatCard label="Posición" value={totals.impressions > 0 ? pos(totals.position) : "—"} />
      </div>
      <p className="mt-2 text-xs text-foreground/70">{formatNumber(totals.queries)} queries distintas</p>
    </div>
  );
}

export function SeoInsightsPanel({ insights }: { insights: SeoInsights | null }) {
  if (!insights) return null;
  const { alerts, segments, striking, cannibalization, wrongTarget, movers } = insights;

  return (
    <div className="space-y-8">
      <section aria-label="Alertas de SEO" className="space-y-3">
        <div className="flex items-center gap-2">
          <BellRing size={16} className="text-accent" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Alertas</h2>
          {alerts.length > 0 && <Badge tone="warning">{alerts.length} abiertas</Badge>}
        </div>
        <p className="text-xs text-foreground/70">
          Las genera el cron diario comparando la semana {insights.currentRange} con la {insights.previousRange}. Cada problema avisa a los
          administradores una sola vez y se cierra solo cuando deja de cumplirse.
        </p>
        {alerts.length === 0 ? (
          <Empty icon={BellRing} title="Sin alertas abiertas" description="Ninguna búsqueda canibaliza, ninguna página cayó más de 10 posiciones y todas las URLs del sitemap responden 200." />
        ) : (
          <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-center gap-2 sm:w-52">
                  <Badge tone={SEVERITY[alert.severity].tone}>{SEVERITY[alert.severity].label}</Badge>
                  <span className="text-[11px] font-medium text-foreground/70">{KIND_LABEL[alert.kind]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                  {alert.detail && <p className="mt-0.5 break-words text-xs text-foreground/70">{alert.detail}</p>}
                </div>
                <time dateTime={alert.firstSeenAt} className="shrink-0 text-[11px] text-foreground/70">
                  desde {formatDateTime(alert.firstSeenAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Marca y no marca" className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Marca vs. no marca</h2>
        <p className="text-xs text-foreground/70">
          Últimos {insights.windowDays} días. Marca = la búsqueda contiene «skycode» o «sky code»; el crecimiento real del SEO está en la no marca.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <SegmentCard title="Marca" totals={segments.brand} />
          <SegmentCard title="No marca" totals={segments.nonBrand} />
        </div>
      </section>

      <section aria-label="Distancia de ataque" className="space-y-3">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-accent" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Distancia de ataque</h2>
        </div>
        <p className="text-xs text-foreground/70">
          Búsquedas en posición 8–20 con al menos 5 impresiones: a un ajuste de la primera página. Trabaja primero la página indicada.
        </p>
        {striking.length === 0 ? (
          <Empty icon={Crosshair} title="Nada en distancia de ataque" description="Ninguna búsqueda con impresiones suficientes está entre las posiciones 8 y 20 en esta ventana." />
        ) : (
          <TableShell
            caption="Búsquedas en posición 8 a 20"
            headers={[{ label: "Query" }, { label: "Página" }, { label: "Impresiones", right: true }, { label: "Posición", right: true }]}
          >
            {striking.map((row) => (
              <tr key={row.query}>
                <td className="px-5 py-3 text-foreground">
                  {row.query} {row.isBrand && <Badge>marca</Badge>}
                </td>
                <td className="px-5 py-3 break-all text-foreground/70">{shortUrl(row.topPage)}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.impressions}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground">{pos(row.position)}</td>
              </tr>
            ))}
          </TableShell>
        )}
      </section>

      <section aria-label="Canibalización" className="space-y-3">
        <div className="flex items-center gap-2">
          <GitMerge size={16} className="text-accent" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Canibalización y página equivocada</h2>
        </div>
        <p className="text-xs text-foreground/70">
          Búsquedas (sin marca) donde más de una URL del mismo idioma recibe impresiones, y búsquedas cuya URL más vista no es la que el mapa de
          keywords asigna a ese tema (<code className="font-mono">src/seo/keyword-map.ts</code>).
        </p>
        {cannibalization.length === 0 && wrongTarget.length === 0 ? (
          <Empty icon={GitMerge} title="Cada búsqueda tiene una sola URL" description="Ninguna búsqueda con impresiones reparte su visibilidad entre dos páginas, y ninguna rankea una página distinta de la asignada." />
        ) : (
          <TableShell
            caption="Búsquedas que canibalizan o rankean la página equivocada"
            headers={[{ label: "Query" }, { label: "Problema" }, { label: "URLs" }, { label: "Impresiones", right: true }]}
          >
            {cannibalization.map((row) => (
              <tr key={`c-${row.locale}-${row.query}`}>
                <td className="px-5 py-3 text-foreground">{row.query}</td>
                <td className="px-5 py-3"><Badge tone="warning">Canibalización</Badge></td>
                <td className="px-5 py-3 text-foreground/70">
                  <ul className="space-y-0.5">
                    {row.pages.map((p) => (
                      <li key={p.page} className="break-all">
                        {shortUrl(p.page)} <span className="font-mono">· pos. {pos(p.position)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.totalImpressions}</td>
              </tr>
            ))}
            {wrongTarget.map((row) => (
              <tr key={`w-${row.query}`}>
                <td className="px-5 py-3 text-foreground">{row.query}</td>
                <td className="px-5 py-3"><Badge tone="warning">Página equivocada</Badge></td>
                <td className="px-5 py-3 text-foreground/70">
                  <span className="break-all">rankea {row.actualPath}</span>
                  <br />
                  <span className="break-all">asignada: {row.expectedPaths.join(" · ")}</span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.impressions}</td>
              </tr>
            ))}
          </TableShell>
        )}
      </section>

      <section aria-label="Cambios semana a semana" className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" aria-hidden="true" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Semana contra semana</h2>
        </div>
        <p className="text-xs text-foreground/70">
          {insights.currentRange} frente a {insights.previousRange}. Un cambio de posición negativo es una mejora.
        </p>
        {movers.length === 0 ? (
          <Empty icon={TrendingUp} title="Sin comparación todavía" description="Hacen falta dos semanas de datos. Para cargar el pasado de una vez: POST /api/cron/seo-pulse?backfillDays=90." />
        ) : (
          <TableShell
            caption="Búsquedas con su cambio de posición e impresiones frente a la semana anterior"
            headers={[{ label: "Query" }, { label: "Impresiones", right: true }, { label: "Antes", right: true }, { label: "Posición", right: true }, { label: "Cambio", right: true }]}
          >
            {movers.map((row) => (
              <tr key={row.query}>
                <td className="px-5 py-3 text-foreground">
                  {row.query} {row.isBrand && <Badge>marca</Badge>}
                </td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.impressions}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground/70">{row.previousImpressions}</td>
                <td className="px-5 py-3 text-right font-mono text-foreground">{pos(row.position)}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {row.positionDelta === null ? (
                    <span className="text-foreground/70">nueva</span>
                  ) : (
                    <span className={row.positionDelta < -0.05 ? "text-success" : row.positionDelta > 0.05 ? "text-danger" : "text-foreground/70"}>
                      {row.positionDelta > 0 ? "+" : ""}
                      {row.positionDelta.toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </section>
    </div>
  );
}
