"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp, Users2, Target, BarChart3 } from "lucide-react";
import { Button } from "./ui/Button";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { formatCompactCop, formatMoney } from "@/lib/utils";
import { StatCard } from "./ui/StatCard";
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

// Un tono por estado (antes alternaban 2 azules y 3 estados se veían igual).
// Entregado y Garantía SLA comparten "terminado" y se distinguen por opacidad.
const STATUS_BAR: Record<string, string> = {
  Planificación: "bg-foreground/35",
  "En Desarrollo": "bg-info",
  "Fase QA": "bg-warning",
  Entregado: "bg-success",
  "Garantía SLA": "bg-success/55",
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
        {/* Tono neutro a propósito: ni "ingresos" ni "conversión" son buenos/malos por sí mismos. */}
        <StatCard label="Ingresos (12 meses)" value={formatMoney(kpis.revenueLast12MonthsCop, "COP")} icon={<TrendingUp size={18} className="text-accent-strong" />} />
        <StatCard label="Leads (12 meses)" value={kpis.leadsLast12Months} icon={<Users2 size={18} className="text-accent-strong" />} />
        <StatCard
          label="Tasa de conversión"
          value={kpis.conversionRatePct !== null ? `${kpis.conversionRatePct.toFixed(1)}%` : "—"}
          icon={<Target size={18} className="text-accent-strong" />}
        />
        <StatCard
          label="Margen promedio"
          value={kpis.avgMarginPct !== null ? `${kpis.avgMarginPct.toFixed(1)}%` : "—"}
          icon={<BarChart3 size={18} className="text-accent-strong" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="revenue-chart-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
          <h2 id="revenue-chart-heading" className="text-sm font-bold text-foreground mb-5">
            Ingresos mensuales
          </h2>
          {/* Móvil: filas horizontales con el monto a la vista (12 barras verticales dejaban
              19px por barra y las etiquetas se pisaban). Desde `sm`: columnas, con el gráfico
              oculto a lectores de pantalla y la MISMA lista como alternativa accesible. */}
          <ol className="space-y-2 sm:sr-only">
            {monthlyRevenue.map((point) => (
              <li key={point.month} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-xs">
                <span className="font-mono uppercase text-foreground/70">{monthLabel(point.month)}</span>
                <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(1, (point.totalCop / maxRevenue) * 100)}%` }} />
                </span>
                <span className="text-right font-mono tabular-nums text-foreground">{formatCompactCop(point.totalCop)}</span>
              </li>
            ))}
          </ol>
          <div aria-hidden="true" className="hidden sm:block">
            <p className="mb-2 text-right font-mono text-xs text-foreground/70">Máximo: {formatCompactCop(maxRevenue)}</p>
            <div className="flex h-40 items-end gap-1.5 border-b border-foreground/15">
              {monthlyRevenue.map((point) => (
                <div key={point.month} className="group flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t-md bg-accent transition-colors group-hover:bg-accent-strong"
                    style={{ height: `${Math.max(1, (point.totalCop / maxRevenue) * 100)}%` }}
                    title={formatMoney(point.totalCop, "COP")}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {monthlyRevenue.map((point) => (
                <span key={point.month} className="flex-1 text-center font-mono text-[11px] uppercase text-foreground/70">
                  {monthLabel(point.month)}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="leads-chart-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
          <h2 id="leads-chart-heading" className="text-sm font-bold text-foreground mb-5">
            Leads por canal
          </h2>
          {leadsByChannel.length === 0 ? (
            <p className="text-xs text-foreground/70">Sin leads en los últimos 12 meses.</p>
          ) : (
            <div className="space-y-3">
              {leadsByChannel.map((c) => (
                <div key={c.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{CHANNEL_LABELS[c.channel] ?? c.channel}</span>
                    <span className="font-mono text-foreground/70">
                      {c.count} {c.wonCount > 0 && <span className="text-success">({c.wonCount} ganados)</span>}
                    </span>
                  </div>
                  <div aria-hidden="true" className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
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
          <p className="text-xs text-foreground/70">Sin proyectos todavía.</p>
        ) : (
          <>
            <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full bg-foreground/10">
              {projectsByStatus.map((p) => (
                <div
                  key={p.status}
                  className={`h-full ${STATUS_BAR[p.status] ?? "bg-foreground/35"}`}
                  style={{ width: `${(p.count / totalProjects) * 100}%` }}
                  title={`${STATUS_LABELS[p.status] ?? p.status}: ${p.count}`}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {projectsByStatus.map((p) => (
                <div key={p.status} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[p.status] ?? "bg-foreground/35"}`} />
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
