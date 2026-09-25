"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Repeat, Plus, Trash2, Pause, Play, XCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ModalShell } from "./ModalShell";
import { CurrencySelect } from "./CurrencySelect";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney } from "@/lib/utils";
import { logError } from "@/lib/logger";
import type { Currency } from "@/lib/currency";
import type { Project, Retainer, RetainerStatus } from "./types";

const STATUS_LABELS: Record<RetainerStatus, string> = { active: "Activo", paused: "Pausado", cancelled: "Cancelado" };
const STATUS_TONES: Record<RetainerStatus, BadgeTone> = { active: "success", paused: "warning", cancelled: "neutral" };

export function RetainersBoard({
  retainers: initialRetainers,
  projects,
  canWrite,
}: {
  retainers: Retainer[];
  projects: Pick<Project, "id" | "title" | "client">[];
  canWrite: boolean;
}) {
  const [retainers, setRetainers] = useState<Retainer[]>(initialRetainers);
  const [prevInitial, setPrevInitial] = useState(initialRetainers);
  if (initialRetainers !== prevInitial) {
    setPrevInitial(initialRetainers);
    setRetainers(initialRetainers);
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleStatusChange = async (retainer: Retainer, status: RetainerStatus) => {
    setBusyId(retainer.id);
    try {
      const res = await fetch(`/api/retainers/${retainer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRetainers((prev) => prev.map((r) => (r.id === retainer.id ? { ...r, status } : r)));
      }
    } catch (err) {
      logError("Error al cambiar el estado del retainer", err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (retainer: Retainer) => {
    if (!window.confirm(`¿Eliminar el retainer "${retainer.description}"? Deja de generar facturas futuras.`)) return;
    setBusyId(retainer.id);
    try {
      const res = await fetch(`/api/retainers/${retainer.id}`, { method: "DELETE" });
      if (res.ok) setRetainers((prev) => prev.filter((r) => r.id !== retainer.id));
    } catch (err) {
      logError("Error al eliminar el retainer", err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Retainers</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Contratos recurrentes mensuales — cada uno genera una factura automática en su fecha de cobro.
          </p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={() => setCreateOpen(true)} className="self-start sm:self-auto">
            <Plus size={14} />
            <span>Nuevo retainer</span>
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {retainers.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Sin retainers todavía"
            description="Crea el primero para empezar a facturar mantenimiento recurrente."
            action={canWrite ? { label: "Nuevo retainer", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Retainers recurrentes, con proyecto, monto mensual y próxima fecha de cobro</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Descripción / Cliente</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Monto mensual</th>
                  <th scope="col" className="px-5 py-3.5">Próximo cobro</th>
                  <th scope="col" className="px-5 py-3.5">Estado</th>
                  {canWrite && <th scope="col" className="px-5 py-3.5 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {retainers.map((retainer) => (
                  <tr key={retainer.id}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground">{retainer.description}</div>
                      <div className="text-[11px] text-foreground/60 font-mono">{retainer.client_name}</div>
                    </td>
                    <td className="px-5 py-4 text-foreground/70">{retainer.project_title}</td>
                    <td className="px-5 py-4 font-mono font-bold text-green-700">{formatMoney(retainer.amount, retainer.currency)}</td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60 whitespace-nowrap">
                      {new Date(`${retainer.next_invoice_date}T00:00:00`).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[retainer.status]}>{STATUS_LABELS[retainer.status]}</Badge>
                    </td>
                    {canWrite && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {retainer.status === "active" && (
                            <button
                              onClick={() => handleStatusChange(retainer, "paused")}
                              disabled={busyId === retainer.id}
                              aria-label={`Pausar ${retainer.description}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-500/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <Pause size={14} />
                            </button>
                          )}
                          {retainer.status === "paused" && (
                            <button
                              onClick={() => handleStatusChange(retainer, "active")}
                              disabled={busyId === retainer.id}
                              aria-label={`Reanudar ${retainer.description}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-green-700 hover:bg-green-500/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          {retainer.status !== "cancelled" && (
                            <button
                              onClick={() => handleStatusChange(retainer, "cancelled")}
                              disabled={busyId === retainer.id}
                              aria-label={`Cancelar ${retainer.description}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(retainer)}
                            disabled={busyId === retainer.id}
                            aria-label={`Eliminar ${retainer.description}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-500/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateRetainerModal projects={projects} onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateRetainerModal({
  projects,
  onClose,
}: {
  projects: Pick<Project, "id" | "title" | "client">[];
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [projectId, setProjectId] = useState<string>(projects[0] ? String(projects[0].id) : "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [billingDay, setBillingDay] = useState("1");
  const [nextInvoiceDate, setNextInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/retainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: Number(projectId),
          description,
          amount: Number(amount),
          currency,
          billing_day: Number(billingDay),
          next_invoice_date: nextInvoiceDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el retainer.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al crear el retainer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projects.length === 0) {
    return (
      <ModalShell titleId={titleId} title="Nuevo retainer" onClose={onClose}>
        <Alert tone="error">Necesitas al menos un proyecto activo para crear un retainer.</Alert>
      </ModalShell>
    );
  }

  return (
    <ModalShell titleId={titleId} title="Nuevo retainer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
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
            placeholder="Ej. Mantenimiento y soporte mensual"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Monto mensual</label>
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
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Día de cobro (1–28)</label>
            <input
              type="number"
              required
              min="1"
              max="28"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80">Primera factura</label>
            <input
              type="date"
              required
              value={nextInvoiceDate}
              onChange={(e) => setNextInvoiceDate(e.target.value)}
              className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent font-mono"
            />
          </div>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Creando..." : "Crear retainer"}
        </Button>
      </form>
    </ModalShell>
  );
}
