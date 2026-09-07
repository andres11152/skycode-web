"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Pencil,
  Save,
  X,
  Layers,
  FileText,
  Receipt,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "./EmptyState";
import { formatMoney } from "@/lib/utils";
import type { ClientDetail, InvoiceStatus, ProposalStatus } from "./types";

const PROPOSAL_LABELS: Record<ProposalStatus, string> = {
  sent: "Enviada",
  viewed: "Vista",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

const PROPOSAL_STYLES: Record<ProposalStatus, string> = {
  sent: "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  viewed: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  accepted: "bg-green-500/10 border border-green-500/20 text-green-400",
  rejected: "bg-red-500/10 border border-red-500/20 text-red-400",
  expired: "bg-background/20 text-background/50",
};

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  pending: "Por cobrar",
  overdue: "Vencida",
  paid: "Cobrada",
};

const INVOICE_STYLES: Record<InvoiceStatus, string> = {
  pending: "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  overdue: "bg-red-500/10 border border-red-500/20 text-red-400",
  paid: "bg-green-500/10 border border-green-500/20 text-green-400",
};

const PROJECT_STYLES: Record<string, string> = {
  "En Desarrollo": "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  "Fase QA": "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  "Garantía SLA": "bg-green-500/10 border border-green-500/20 text-green-400",
};

export function ClientDetailView({ client, canWrite }: { client: ClientDetail; canWrite: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: client.name,
    company: client.company ?? "",
    phone: client.phone ?? "",
    notes: client.notes,
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el cliente.");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-background/70 hover:text-background transition-colors outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <div className="rounded-xl border border-background/15 bg-background/5 p-6 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            {isEditing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full max-w-sm rounded-lg border border-background/20 bg-background/10 px-3 py-1.5 text-xl font-bold text-background outline-none focus:border-accent"
                aria-label="Nombre del cliente"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-background">{client.name}</h1>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-background/70">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail size={13} className="text-background/50" />
                {client.email}
              </span>
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-background/50" />
                  <input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Empresa"
                    className="rounded-lg border border-background/20 bg-background/10 px-2 py-1 text-xs text-background outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.company && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-background/50" />
                    {client.company}
                  </span>
                )
              )}
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-background/50" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Teléfono"
                    className="rounded-lg border border-background/20 bg-background/10 px-2 py-1 text-xs text-background outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-background/50" />
                    {client.phone}
                  </span>
                )
              )}
            </div>
          </div>

          {canWrite && (
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <Save size={13} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setForm({ name: client.name, company: client.company ?? "", phone: client.phone ?? "", notes: client.notes });
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-background/15 px-3 py-1.5 text-xs text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <X size={13} />
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-background/15 px-3 py-1.5 text-xs text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  <Pencil size={13} />
                  Editar
                </button>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 border-t border-background/10 pt-4">
            <label htmlFor="client-notes" className="text-xs font-medium text-background/70">
              Notas internas
            </label>
            <textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-background/20 bg-background/10 px-3 py-2 text-xs text-background outline-none focus:border-accent"
            />
          </div>
        )}

        {!isEditing && client.notes && (
          <p className="mt-4 border-t border-background/10 pt-4 text-xs text-background/70 whitespace-pre-wrap">
            {client.notes}
          </p>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Proyectos</span>
              <Layers size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-background">{client.projects.length}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Facturado total</span>
              <Receipt size={18} className="text-green-400" />
            </div>
            <div className="text-lg font-bold font-mono text-green-400">{formatMoney(client.totalBilledCop, "COP")}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Saldo pendiente</span>
              <Receipt size={18} className="text-amber-400" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-400">{formatMoney(client.totalOutstandingCop, "COP")}</div>
          </div>
        </SpotlightCard>
      </div>

      <section aria-labelledby="client-projects-heading" className="space-y-3">
        <h2 id="client-projects-heading" className="text-sm font-bold uppercase tracking-wide text-background/60">
          Proyectos
        </h2>
        {client.projects.length === 0 ? (
          <div className="rounded-xl border border-background/15 bg-background/5">
            <EmptyState icon={Layers} title="Sin proyectos" description="Este cliente todavía no tiene proyectos." />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {client.projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-background/15 bg-background/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-background truncate">{project.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      PROJECT_STYLES[project.status] ?? "bg-background/20 text-background/60"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-background/15 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="text-[11px] text-background/50 font-mono">{project.progress}% completado</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="client-proposals-heading" className="space-y-3">
        <h2 id="client-proposals-heading" className="text-sm font-bold uppercase tracking-wide text-background/60">
          Propuestas
        </h2>
        {client.proposals.length === 0 ? (
          <div className="rounded-xl border border-background/15 bg-background/5">
            <EmptyState icon={FileText} title="Sin propuestas" description="Este cliente todavía no recibió propuestas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-background/90">
                <caption className="sr-only">Propuestas comerciales enviadas a este cliente</caption>
                <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                  <tr>
                    <th scope="col" className="px-5 py-3">Título</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background/10">
                  {client.proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-5 py-3 font-medium text-background">{proposal.title}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PROPOSAL_STYLES[proposal.status]}`}>
                          {PROPOSAL_LABELS[proposal.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-background">
                        {formatMoney(proposal.total, proposal.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="client-invoices-heading" className="space-y-3">
        <h2 id="client-invoices-heading" className="text-sm font-bold uppercase tracking-wide text-background/60">
          Facturas
        </h2>
        {client.invoices.length === 0 ? (
          <div className="rounded-xl border border-background/15 bg-background/5">
            <EmptyState icon={Receipt} title="Sin facturas" description="Este cliente todavía no tiene facturas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-background/90">
                <caption className="sr-only">Facturas emitidas a este cliente, con su saldo pendiente</caption>
                <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                  <tr>
                    <th scope="col" className="px-5 py-3">Proyecto</th>
                    <th scope="col" className="px-5 py-3">Descripción</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background/10">
                  {client.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-5 py-3 font-medium text-background">{invoice.project_title}</td>
                      <td className="px-5 py-3 text-background/70 truncate max-w-xs">{invoice.description}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INVOICE_STYLES[invoice.status]}`}>
                          {INVOICE_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono font-bold ${
                          invoice.balance > 0 ? "text-amber-400" : "text-background/50"
                        }`}
                      >
                        {formatMoney(invoice.balance, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
