"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Wallet, TrendingUp } from "lucide-react";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { formatMoney } from "@/lib/utils";
import type { CashProjection } from "@/lib/queries/cashProjection";

export function CashProjectionView({ projection }: { projection: CashProjection }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const handleRefresh = () => startRefresh(() => router.refresh());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Proyección de Caja</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Ingresos confirmados (facturas por cobrar) y probables (propuestas en negociación, ponderadas por probabilidad de cierre).
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing} className="self-start sm:self-auto">
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </Button>
      </div>
      <ExchangeRateNote usdToCopRate={projection.usdToCopRate} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Confirmado (facturas)</span>
            <Wallet size={18} className="text-green-700" />
          </div>
          <div className="text-xl font-bold font-mono text-green-700">{formatMoney(projection.totalConfirmedCop, "COP")}</div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Probable (propuestas, ponderado)</span>
            <TrendingUp size={18} className="text-sky-700" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-700">{formatMoney(projection.totalWeightedProbableCop, "COP")}</div>
        </div>
        <div className="rounded-xl border border-accent/30 bg-accent/5 shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Proyección total</span>
            <Wallet size={18} className="text-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-accent">{formatMoney(projection.totalProjectedCop, "COP")}</div>
        </div>
      </div>

      <section aria-labelledby="confirmado-heading" className="space-y-4">
        <h2 id="confirmado-heading" className="text-sm font-bold font-mono uppercase tracking-wider text-foreground/60">
          Ingresos Confirmados por Mes de Vencimiento
        </h2>
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Período</th>
                  <th className="px-5 py-3.5 text-right">Saldo por cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {projection.invoiceBuckets.map((bucket) => (
                  <tr key={bucket.key}>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {bucket.label}
                      {bucket.key === "overdue" && bucket.totalCop > 0 && (
                        <Badge tone="danger" className="ml-2">Atención</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-green-700">
                      {formatMoney(bucket.totalCop, "COP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="probable-heading" className="space-y-4">
        <h2 id="probable-heading" className="text-sm font-bold font-mono uppercase tracking-wider text-foreground/60">
          Ingresos Probables (Propuestas en Negociación)
        </h2>
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Cantidad</th>
                  <th className="px-5 py-3.5">Probabilidad</th>
                  <th className="px-5 py-3.5">Valor total</th>
                  <th className="px-5 py-3.5 text-right">Valor ponderado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {projection.proposalBuckets.map((bucket) => (
                  <tr key={bucket.status}>
                    <td className="px-5 py-4 font-medium text-foreground">{bucket.label}</td>
                    <td className="px-5 py-4 font-mono text-foreground/70">{bucket.count}</td>
                    <td className="px-5 py-4 font-mono text-foreground/70">{bucket.probabilityPct}%</td>
                    <td className="px-5 py-4 font-mono text-foreground/70">{formatMoney(bucket.totalCop, "COP")}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-sky-700">
                      {formatMoney(bucket.weightedCop, "COP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-foreground/40">
          Probabilidad estimada por estado (Enviada 30%, Vista 50%) — heurística fija, no calculada de datos históricos de cierre.
        </p>
      </section>
    </div>
  );
}
