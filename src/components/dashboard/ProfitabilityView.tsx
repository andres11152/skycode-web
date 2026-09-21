"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { formatMoney } from "@/lib/utils";
import type { ProjectProfitability, CampaignProfitability } from "./types";

const CHANNEL_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  linkedin_ads: "LinkedIn Ads",
  organico: "Orgánico",
  referido: "Referido",
  otro: "Otro",
};

export function ProfitabilityView({
  projects,
  campaigns,
  usdToCopRate,
}: {
  projects: ProjectProfitability[];
  campaigns: CampaignProfitability[];
  usdToCopRate: number;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const handleRefresh = () => startRefresh(() => router.refresh());

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rentabilidad</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Cotizado, costo de horas, gastos operativos y facturado por proyecto — margen neto por canal.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-foreground/20 bg-foreground/5 px-4 py-2 text-xs font-medium text-foreground hover:bg-foreground/15 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>
      <ExchangeRateNote usdToCopRate={usdToCopRate} />

      <section aria-labelledby="por-proyecto-heading" className="space-y-4">
        <h2 id="por-proyecto-heading" className="text-sm font-bold font-mono uppercase tracking-wider text-foreground/60">
          Por Proyecto
        </h2>
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          {projects.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sin proyectos todavía" description="El reporte aparece cuando haya proyectos con horas o facturas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th className="px-5 py-3.5">Proyecto / Cliente</th>
                    <th className="px-5 py-3.5">Cotizado</th>
                    <th className="px-5 py-3.5">Horas</th>
                    <th className="px-5 py-3.5">Costo Horas</th>
                    <th className="px-5 py-3.5">Gastos</th>
                    <th className="px-5 py-3.5">Facturado</th>
                    <th className="px-5 py-3.5">Margen</th>
                    <th className="px-5 py-3.5">Desvío</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{p.title}</div>
                        <div className="text-[10px] text-foreground/50 font-mono">{p.client_name}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-foreground/80">
                        {p.quotedAmountOriginal !== null && p.quotedCurrencyOriginal ? (
                          <>
                            {formatMoney(p.quotedAmountOriginal, p.quotedCurrencyOriginal)}
                            {p.quotedCurrencyOriginal === "USD" && p.quotedAmountCop !== null && (
                              <div className="text-[10px] text-foreground/40">
                                ≈ {formatMoney(p.quotedAmountCop, "COP")}
                              </div>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-foreground/80">{p.totalHours.toFixed(1)}h</td>
                      <td className="px-5 py-3.5 font-mono text-amber-700">{formatMoney(p.totalCostCop, "COP")}</td>
                      <td className="px-5 py-3.5 font-mono text-amber-700">{formatMoney(p.totalExpensesCop, "COP")}</td>
                      <td className="px-5 py-3.5 font-mono text-sky-700">{formatMoney(p.totalBilledCop, "COP")}</td>
                      <td className={`px-5 py-3.5 font-mono font-bold ${p.marginVsBilledCop >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatMoney(p.marginVsBilledCop, "COP")}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.deviationPct !== null ? (
                          <span className={`inline-flex items-center gap-1 font-mono font-semibold ${p.deviationPct > 0 ? "text-red-700" : "text-green-700"}`}>
                            {p.deviationPct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(p.deviationPct).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="por-canal-heading" className="space-y-4">
        <h2 id="por-canal-heading" className="text-sm font-bold font-mono uppercase tracking-wider text-foreground/60">
          Por Canal
        </h2>
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          {campaigns.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sin campañas todavía" description="El margen por canal aparece cuando haya inversión registrada." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th className="px-5 py-3.5">Campaña</th>
                    <th className="px-5 py-3.5">Canal</th>
                    <th className="px-5 py-3.5">Inversión</th>
                    <th className="px-5 py-3.5">Facturado</th>
                    <th className="px-5 py-3.5">Costo Horas</th>
                    <th className="px-5 py-3.5">Margen Neto</th>
                    <th className="px-5 py-3.5">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3.5 font-bold text-foreground">{c.name}</td>
                      <td className="px-5 py-3.5 text-foreground/70">{CHANNEL_LABELS[c.channel] || c.channel}</td>
                      <td className="px-5 py-3.5 font-mono text-foreground/80">{formatMoney(c.totalSpendCop, "COP")}</td>
                      <td className="px-5 py-3.5 font-mono text-sky-700">{formatMoney(c.totalBilledCop, "COP")}</td>
                      <td className="px-5 py-3.5 font-mono text-amber-700">{formatMoney(c.totalCostCop, "COP")}</td>
                      <td className={`px-5 py-3.5 font-mono font-bold ${c.netMarginCop >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatMoney(c.netMarginCop, "COP")}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {c.roi !== null ? (
                          <span className={c.roi >= 0 ? "text-green-700" : "text-red-700"}>
                            {(c.roi * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-[10px] text-foreground/40 max-w-2xl">
          La atribución de campaña a proyecto se infiere por el correo del lead que llegó por esa campaña y luego
          se convirtió en cliente — es una aproximación, no una relación garantizada por el esquema.
        </p>
      </section>
    </div>
  );
}
