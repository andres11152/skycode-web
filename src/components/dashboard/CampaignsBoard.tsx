"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Campaign, CampaignChannel, CampaignStatus } from "./types";

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  linkedin_ads: "LinkedIn Ads",
  organico: "Orgánico",
  referido: "Referido",
  otro: "Otro",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  ended: "Finalizada",
};

export function CampaignsBoard({ initialCampaigns, canWrite }: { initialCampaigns: Campaign[]; canWrite: boolean }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [prevInitial, setPrevInitial] = useState(initialCampaigns);
  if (initialCampaigns !== prevInitial) {
    setPrevInitial(initialCampaigns);
    setCampaigns(initialCampaigns);
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [spendModalCampaign, setSpendModalCampaign] = useState<Campaign | null>(null);

  const handleRefresh = () => startRefresh(() => router.refresh());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campañas y Adquisición</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Inversión por campaña, costo por lead y conversión — sin cruzar con fichas de prospectos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>
          {canWrite && (
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              <span>Nueva Campaña</span>
            </Button>
          )}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState
            icon={Megaphone}
            title="Sin campañas todavía"
            description="Crea la primera para empezar a medir costo por lead."
            action={canWrite ? { label: "Nueva Campaña", onClick: () => setCreateOpen(true) } : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const spendPct = c.budget ? Math.min(100, (c.totalSpend / c.budget) * 100) : null;
            return (
              <div key={c.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-wide text-foreground/50">
                      {CHANNEL_LABELS[c.channel]}
                    </span>
                  </div>
                  <Badge
                    tone={c.status === "active" ? "success" : c.status === "paused" ? "warning" : "neutral"}
                    className="shrink-0"
                  >
                    {STATUS_LABELS[c.status]}
                  </Badge>
                </div>

                {(c.overBudget || c.cplSpike) && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{c.overBudget ? "Superó el presupuesto" : "CPL muy por encima del promedio"}</span>
                  </div>
                )}

                {c.budget !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-foreground/60">
                      <span>{formatMoney(c.totalSpend, c.currency)}</span>
                      <span>{formatMoney(c.budget, c.currency)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${c.overBudget ? "bg-red-400" : "bg-accent"}`}
                        style={{ width: `${spendPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                    <Users size={12} className="mx-auto text-accent mb-1" />
                    <div className="text-sm font-bold font-mono text-foreground">{c.leadCount}</div>
                    <div className="text-[9px] text-foreground/50">Leads</div>
                  </div>
                  <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                    <CheckCircle2 size={12} className="mx-auto text-green-700 mb-1" />
                    <div className="text-sm font-bold font-mono text-green-700">{c.wonCount}</div>
                    <div className="text-[9px] text-foreground/50">Ganados</div>
                  </div>
                  <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                    <DollarSign size={12} className="mx-auto text-sky-700 mb-1" />
                    <div className="text-sm font-bold font-mono text-sky-700">
                      {c.cpl !== null ? formatMoney(c.cpl, c.currency) : "—"}
                    </div>
                    <div className="text-[9px] text-foreground/50">CPL</div>
                  </div>
                </div>

                {c.conversionRate !== null && (
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/60">
                    <TrendingUp size={12} className="text-accent" />
                    <span>{(c.conversionRate * 100).toFixed(0)}% de conversión a ganado</span>
                  </div>
                )}

                {canWrite && (
                  <Button variant="secondary" onClick={() => setSpendModalCampaign(c)} className="w-full">
                    Registrar inversión del día
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {createOpen && <CreateCampaignModal onClose={() => setCreateOpen(false)} />}
        {spendModalCampaign && (
          <SpendModal campaign={spendModalCampaign} onClose={() => setSpendModalCampaign(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("google_ads");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          utm_campaign: utmCampaign || undefined,
          budget: budget ? Number(budget) : undefined,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la campaña.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al crear la campaña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Nueva campaña" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Lanzamiento Q3 2026"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Canal</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as CampaignChannel)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            {(Object.keys(CHANNEL_LABELS) as CampaignChannel[]).map((ch) => (
              <option key={ch} value={ch} className="bg-background text-foreground">{CHANNEL_LABELS[ch]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">
            UTM de campaña <span className="text-foreground/50 font-normal">(opcional, para atribución automática)</span>
          </label>
          <input
            type="text"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
            placeholder="lanzamiento-2026"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent font-mono"
          />
          <p className="text-[10px] text-foreground/50">
            Un lead cuyo enlace traiga <code className="text-accent">utm_campaign={utmCampaign || "..."}</code> se
            enlaza acá solo, sin tener que asignarlo a mano.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Presupuesto (opcional)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000000"
              className="flex-1 min-w-0 rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent font-mono"
            />
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Creando..." : "Crear campaña"}
        </Button>
      </form>
    </ModalShell>
  );
}

function SpendModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const [spendDate, setSpendDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(campaign.currency);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spend_date: spendDate, amount: Number(amount), currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar la inversión.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al registrar la inversión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title={`Inversión — ${campaign.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Fecha</label>
          <input
            type="date"
            required
            value={spendDate}
            onChange={(e) => setSpendDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
          />
          <p className="text-[10px] text-foreground/50">
            Si ya hay un monto cargado para esta fecha, se reemplaza — no se duplica.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Monto</label>
          <div className="flex gap-2">
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150000"
              className="flex-1 min-w-0 rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent font-mono"
            />
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
          <p className="text-[10px] text-foreground/50">
            Útil si la plataforma de anuncios factura en una moneda distinta a la campaña.
          </p>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Guardando..." : "Guardar inversión"}
        </Button>
      </form>
    </ModalShell>
  );
}
