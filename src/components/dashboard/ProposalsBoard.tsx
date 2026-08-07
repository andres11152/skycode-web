"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { FileText, Plus, RefreshCw, Copy, Check, Trash2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Proposal, ProposalStatus } from "./types";

const STATUS_LABELS: Record<ProposalStatus, string> = {
  sent: "Enviada",
  viewed: "Vista",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

const STATUS_STYLES: Record<ProposalStatus, string> = {
  sent: "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  viewed: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  accepted: "bg-green-500/10 border border-green-500/20 text-green-400",
  rejected: "bg-red-500/10 border border-red-500/20 text-red-400",
  expired: "bg-background/20 text-background/50",
};

interface DraftItem {
  description: string;
  quantity: string;
  unit_price: string;
}

const EMPTY_ITEM: DraftItem = { description: "", quantity: "1", unit_price: "" };

export function ProposalsBoard({ initialProposals, origin }: { initialProposals: Proposal[]; origin: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [prevInitial, setPrevInitial] = useState(initialProposals);
  if (initialProposals !== prevInitial) {
    setPrevInitial(initialProposals);
    setProposals(initialProposals);
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefresh = () => startRefresh(() => router.refresh());

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`${origin}/propuesta/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-background">Propuestas Comerciales</h1>
          <p className="mt-1 text-xs text-background/70 font-sans">
            Enlace público por propuesta — el cliente ve, acepta o rechaza sin necesitar cuenta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-background/20 bg-background/5 px-4 py-2 text-xs font-medium text-background hover:bg-background/15 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <Plus size={14} />
            <span>Nueva Propuesta</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {proposals.length === 0 ? (
          <EmptyState icon={FileText} title="Sin propuestas todavía" description="Crea la primera para empezar a cerrar proyectos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-background/90">
              <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                <tr>
                  <th className="px-5 py-3.5">Propuesta / Cliente</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Vigencia</th>
                  <th className="px-5 py-3.5 text-right">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background/10">
                {proposals.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-background">{p.title}</div>
                      <div className="text-[11px] text-background/60 font-mono">{p.client_name} · {p.client_email}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-green-400">
                      {formatMoney(p.total, p.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-background/60">
                      {p.valid_until ? new Date(p.valid_until).toLocaleDateString("es-CO") : "Sin vencimiento"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleCopy(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        {copiedId === p.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        <span>{copiedId === p.id ? "Copiado" : "Copiar enlace"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateProposalModal onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateProposalModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [taxRate, setTaxRate] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const total = subtotal * (1 + (Number(taxRate) || 0) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: clientEmail,
          client_name: clientName,
          title,
          currency,
          tax_rate: Number(taxRate) || 0,
          valid_until: validUntil || undefined,
          items: items
            .filter((it) => it.description.trim())
            .map((it) => ({
              description: it.description,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la propuesta.");
        return;
      }
      setProposalUrl(data.proposalUrl);
    } catch {
      setError("Ocurrió un error de red al crear la propuesta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!proposalUrl) return;
    navigator.clipboard.writeText(proposalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onClose();
    if (proposalUrl) router.refresh();
  };

  return (
    <ModalShell titleId={titleId} title="Nueva propuesta" onClose={handleClose} maxWidthClassName="max-w-xl">
      {proposalUrl ? (
        <div className="space-y-4">
          <p className="text-xs text-background/70">
            Propuesta creada. Compártele este enlace — también se intentó enviar por correo.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-background/15 bg-background/10 p-3">
            <span className="flex-1 truncate text-xs font-mono text-background/90">{proposalUrl}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
          <button
            onClick={handleClose}
            className="w-full rounded-xl border border-background/20 px-4 py-2.5 text-xs font-medium text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">Nombre del cliente</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">Correo del cliente</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-[1fr_7rem] gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">Título de la propuesta</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Plataforma de gestión de inventario"
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">Moneda</label>
              <CurrencySelect value={currency} onChange={setCurrency} className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-background/80">Partidas</label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  required
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  placeholder="Descripción"
                  className="flex-1 min-w-0 rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  className="w-16 rounded-lg border border-background/15 bg-background/10 py-2 px-2 text-xs text-background outline-none focus:border-accent font-mono"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, { unit_price: e.target.value })}
                  placeholder="Precio"
                  className="w-28 rounded-lg border border-background/15 bg-background/10 py-2 px-2 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent font-mono"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label="Quitar partida"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="text-[11px] font-semibold text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
            >
              + Agregar partida
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">IVA / Impuesto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-background/80">Vigente hasta (opcional)</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-background/15 bg-background/10 p-3 text-xs font-mono">
            <span className="text-background/60">Total estimado</span>
            <span className="font-bold text-green-400">{formatMoney(total, currency)}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            {isSubmitting ? "Creando..." : "Crear propuesta"}
          </button>
        </form>
      )}
    </ModalShell>
  );
}
