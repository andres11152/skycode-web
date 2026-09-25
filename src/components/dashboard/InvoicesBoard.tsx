"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Receipt, Plus, RefreshCw, AlertTriangle, Wallet, CheckCircle2, Clock, Download } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney } from "@/lib/utils";
import { convertCurrency, type Currency } from "@/lib/currency";
import type { Invoice, InvoiceStatus, Project } from "./types";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Por cobrar",
  overdue: "Vencida",
  paid: "Cobrada",
};

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  pending: "info",
  overdue: "danger",
  paid: "success",
};

export function InvoicesBoard({
  initialInvoices,
  projects,
  canWrite,
  usdToCopRate,
}: {
  initialInvoices: Invoice[];
  projects: Pick<Project, "id" | "title" | "client">[];
  canWrite: boolean;
  usdToCopRate: number;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [prevInitial, setPrevInitial] = useState(initialInvoices);
  if (initialInvoices !== prevInitial) {
    setPrevInitial(initialInvoices);
    setInvoices(initialInvoices);
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const handleRefresh = () => startRefresh(() => router.refresh());

  // Convertido a COP antes de sumar — una factura en USD y otra en COP no
  // se pueden acumular en el mismo total sin pasar por la tasa de cambio.
  const summary = useMemo(() => {
    const now = new Date();
    let porCobrar = 0;
    let vencido = 0;
    let cobradoEsteMes = 0;
    for (const inv of invoices) {
      const balanceCop = convertCurrency(inv.balance, inv.currency, "COP", usdToCopRate);
      if (inv.status === "pending") porCobrar += balanceCop;
      if (inv.status === "overdue") vencido += balanceCop;
      for (const p of inv.payments) {
        const paidAt = new Date(p.paid_at);
        if (paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth()) {
          cobradoEsteMes += convertCurrency(p.amount, inv.currency, "COP", usdToCopRate);
        }
      }
    }
    return { porCobrar, vencido, cobradoEsteMes };
  }, [invoices, usdToCopRate]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Facturación y Cobranza</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Control interno de cuentas por cobrar — no reemplaza facturación electrónica.
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
              <span>Nueva Factura</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Por Cobrar</span>
            <Clock size={16} className="text-sky-700" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-700">{formatMoney(summary.porCobrar, "COP")}</div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Vencido</span>
            <AlertTriangle size={16} className="text-red-700" />
          </div>
          <div className="text-xl font-bold font-mono text-red-700">{formatMoney(summary.vencido, "COP")}</div>
        </div>
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Cobrado Este Mes</span>
            <CheckCircle2 size={16} className="text-green-700" />
          </div>
          <div className="text-xl font-bold font-mono text-green-700">{formatMoney(summary.cobradoEsteMes, "COP")}</div>
        </div>
      </div>
      <ExchangeRateNote usdToCopRate={usdToCopRate} />

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin facturas todavía"
            description="Emite la primera desde un proyecto activo."
            action={canWrite ? { label: "Nueva Factura", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th className="px-5 py-3.5">Proyecto / Cliente</th>
                  <th className="px-5 py-3.5">Descripción</th>
                  <th className="px-5 py-3.5">Saldo</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Vence</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{inv.project_title}</span>
                        {inv.invoice_number && (
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-mono text-foreground/60">
                            {inv.invoice_number}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-foreground/60 font-mono">{inv.client_name}</div>
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate">{inv.description}</td>
                    <td className="px-5 py-4 font-mono">
                      <div className={`font-bold ${inv.balance > 0 ? "text-amber-700" : "text-green-700"}`}>
                        {formatMoney(inv.balance, inv.currency)}
                      </div>
                      {inv.paidAmount > 0 && (
                        <div className="text-[10px] text-foreground/50">
                          de {formatMoney(inv.amount, inv.currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                      {inv.status === "overdue" && (
                        <div className="text-[10px] text-red-700/80 mt-1">{inv.daysOverdue}d de mora</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60">
                      {new Date(inv.due_date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          aria-label={`Descargar PDF de la factura ${inv.invoice_number}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Download size={14} />
                        </a>
                        {canWrite && inv.balance > 0 && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1.5 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Wallet size={12} />
                            <span>Registrar pago</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateInvoiceModal projects={projects} onClose={() => setCreateOpen(false)} />}
        {paymentInvoice && (
          <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateInvoiceModal({
  projects,
  onClose,
}: {
  projects: Pick<Project, "id" | "title" | "client">[];
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, description, amount: Number(amount), currency, due_date: dueDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la factura.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al crear la factura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projects.length === 0) {
    return (
      <ModalShell titleId={titleId} title="Nueva factura" onClose={onClose}>
        <p className="text-xs text-foreground/70">
          No hay proyectos activos todavía. Crea un proyecto (o acepta una propuesta) antes de emitir una factura.
        </p>
      </ModalShell>
    );
  }

  return (
    <ModalShell titleId={titleId} title="Nueva factura" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-background text-foreground">
                {p.title} — {p.client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Descripción</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Anticipo 50% — Fase 1"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
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
                className="flex-1 min-w-0 rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
              />
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Vence</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
            />
          </div>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Creando..." : "Crear factura"}
        </Button>
      </form>
    </ModalShell>
  );
}

function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const [amount, setAmount] = useState(String(invoice.balance));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), paid_at: paidAt, method: method || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar el pago.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al registrar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title={`Registrar pago — ${invoice.project_title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-[11px] text-foreground/60">
          Saldo pendiente: <span className="font-mono font-bold text-amber-700">{formatMoney(invoice.balance, invoice.currency)}</span>
        </p>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Monto abonado</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Fecha</label>
            <input
              type="date"
              required
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Método (opcional)</label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Transferencia"
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
            />
          </div>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Guardando..." : "Registrar pago"}
        </Button>
      </form>
    </ModalShell>
  );
}
