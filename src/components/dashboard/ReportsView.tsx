"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp, Users2, Target, BarChart3 } from "lucide-react";
import { Button } from "./ui/Button";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { formatMoney } from "@/lib/utils";
import type { ExecutiveReport } from "@/lib/queries/reports";

const CHANNEL_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  linkedin_ads: "LinkedIn Ads",
  organico: "Orgánico",
  referido: "Referido",
  otro: "Otro",
  sin_campana: "Sin campaña",
};

const STATUS_LABELS: Record<string, string> = {
  Planificación: "Planificación",
  "En Desarrollo": "En Desarrollo",
  "Fase QA": "Fase QA",
  Entregado: "Entregado",
  "Garantía SLA": "Garantía SLA",
};

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" });
}

/**
 * Barras horizontales con `<div>`s simples (ancho relativo al máximo de la
 * serie) — mismo patrón ya usado en CapacityView para la barra de horas.
 * No se suma una librería de gráficas nueva para un puñado de barras: el
 * proyecto evita dependencias que no pagan su peso (ver CLAUDE.md).
 */
export function ReportsView({ report, usdToCopRate }: { report: ExecutiveReport; usdToCopRate: number }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const handleRefresh = () => startRefresh(() => router.refresh());

  const { monthlyRevenue, leadsByChannel, projectsByStatus, kpis } = report;
  const maxRevenue = Math.max(1, ...monthlyRevenue.map((m) => m.totalCop));
  const maxLeads = Math.max(1, ...leadsByChannel.map((c) => c.count));
  const totalProjects = projectsByStatus.reduce((sum, p) => sum + p.count, 0) || 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes Ejecutivos</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Ingresos, adquisición y estado de proyectos de los últimos 12 meses, en un vistazo.
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </Button>
      </div>

      <ExchangeRateNote usdToCopRate={usdToCopRate} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Ingresos (12 meses)</span>
            <TrendingUp size={18} className="text-green-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-700">{formatMoney(kpis.revenueLast12MonthsCop, "COP")}</div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Leads (12 meses)</span>
            <Users2 size={18} className="text-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{kpis.leadsLast12Months}</div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Tasa de conversión</span>
            <Target size={18} className="text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {kpis.conversionRatePct !== null ? `${kpis.conversionRatePct.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Margen promedio</span>
            <BarChart3 size={18} className="text-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {kpis.avgMarginPct !== null ? `${kpis.avgMarginPct.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="revenue-chart-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
          <h2 id="revenue-chart-heading" className="text-sm font-bold text-foreground mb-5">
            Ingresos mensuales
          </h2>
          <div className="flex items-end gap-1.5 h-40">
            {monthlyRevenue.map((point) => (
              <div key={point.month} className="flex-1 flex flex-col items-center justify-end gap-1.5 group">
                <div
                  className="w-full rounded-t-md bg-accent transition-colors group-hover:bg-accent-strong"
                  style={{ height: `${Math.max(2, (point.totalCop / maxRevenue) * 100)}%` }}
                  title={formatMoney(point.totalCop, "COP")}
                />
                <span className="text-[9px] font-mono uppercase text-foreground/50">{monthLabel(point.month)}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="leads-chart-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
          <h2 id="leads-chart-heading" className="text-sm font-bold text-foreground mb-5">
            Leads por canal
          </h2>
          {leadsByChannel.length === 0 ? (
            <p className="text-xs text-foreground/60">Sin leads en los últimos 12 meses.</p>
          ) : (
            <div className="space-y-3">
              {leadsByChannel.map((c) => (
                <div key={c.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{CHANNEL_LABELS[c.channel] ?? c.channel}</span>
                    <span className="font-mono text-foreground/60">
                      {c.count} {c.wonCount > 0 && <span className="text-green-700">({c.wonCount} ganados)</span>}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / maxLeads) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="projects-status-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
        <h2 id="projects-status-heading" className="text-sm font-bold text-foreground mb-5">
          Proyectos por estado
        </h2>
        {projectsByStatus.length === 0 ? (
          <p className="text-xs text-foreground/60">Sin proyectos todavía.</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-foreground/10">
              {projectsByStatus.map((p, i) => (
                <div
                  key={p.status}
                  className={i % 2 === 0 ? "h-full bg-accent" : "h-full bg-accent-strong"}
                  style={{ width: `${(p.count / totalProjects) * 100}%` }}
                  title={`${STATUS_LABELS[p.status] ?? p.status}: ${p.count}`}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {projectsByStatus.map((p, i) => (
                <div key={p.status} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${i % 2 === 0 ? "bg-accent" : "bg-accent-strong"}`} />
                  <span className="text-foreground/70">{STATUS_LABELS[p.status] ?? p.status}</span>
                  <span className="font-mono font-bold text-foreground">{p.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
