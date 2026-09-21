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
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { formatMoney } from "@/lib/utils";
import type { ClientDetail, InvoiceStatus, ProposalStatus } from "./types";

const PROPOSAL_LABELS: Record<ProposalStatus, string> = {
  sent: "Enviada",
  viewed: "Vista",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

const PROPOSAL_TONES: Record<ProposalStatus, BadgeTone> = {
  sent: "info",
  viewed: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
};

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  pending: "Por cobrar",
  overdue: "Vencida",
  paid: "Cobrada",
};

const INVOICE_TONES: Record<InvoiceStatus, BadgeTone> = {
  pending: "info",
  overdue: "danger",
  paid: "success",
};

const PROJECT_TONES: Record<string, BadgeTone> = {
  "En Desarrollo": "info",
  "Fase QA": "warning",
  "Garantía SLA": "success",
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            {isEditing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full max-w-sm rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-1.5 text-xl font-bold text-foreground outline-none focus:border-accent"
                aria-label="Nombre del cliente"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground/70">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail size={13} className="text-foreground/50" />
                {client.email}
              </span>
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-foreground/50" />
                  <input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Empresa"
                    className="rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.company && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-foreground/50" />
                    {client.company}
                  </span>
                )
              )}
              {isEditing ? (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-foreground/50" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Teléfono"
                    className="rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
                  />
                </span>
              ) : (
                client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-foreground/50" />
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
                  <Button variant="accent" onClick={handleSave} disabled={isSaving}>
                    <Save size={13} />
                    Guardar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setForm({ name: client.name, company: client.company ?? "", phone: client.phone ?? "", notes: client.notes });
                    }}
                  >
                    <X size={13} />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil size={13} />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 border-t border-foreground/10 pt-4">
            <label htmlFor="client-notes" className="text-xs font-medium text-foreground/70">
              Notas internas
            </label>
            <textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>
        )}

        {!isEditing && client.notes && (
          <p className="mt-4 border-t border-foreground/10 pt-4 text-xs text-foreground/70 whitespace-pre-wrap">
            {client.notes}
          </p>
        )}

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Proyectos</span>
              <Layers size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">{client.projects.length}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Facturado total</span>
              <Receipt size={18} className="text-green-700" />
            </div>
            <div className="text-lg font-bold font-mono text-green-700">{formatMoney(client.totalBilledCop, "COP")}</div>
          </div>
        </SpotlightCard>
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Saldo pendiente</span>
              <Receipt size={18} className="text-amber-700" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-700">{formatMoney(client.totalOutstandingCop, "COP")}</div>
          </div>
        </SpotlightCard>
      </div>

      <section aria-labelledby="client-projects-heading" className="space-y-3">
        <h2 id="client-projects-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Proyectos
        </h2>
        {client.projects.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={Layers} title="Sin proyectos" description="Este cliente todavía no tiene proyectos." />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {client.projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{project.title}</span>
                  <Badge tone={PROJECT_TONES[project.status] ?? "neutral"} className="shrink-0">
                    {project.status}
                  </Badge>
                </div>
                <div className="h-1.5 w-full rounded-full bg-foreground/15 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="text-[11px] text-foreground/50 font-mono">{project.progress}% completado</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="client-proposals-heading" className="space-y-3">
        <h2 id="client-proposals-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Propuestas
        </h2>
        {client.proposals.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={FileText} title="Sin propuestas" description="Este cliente todavía no recibió propuestas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Propuestas comerciales enviadas a este cliente</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th scope="col" className="px-5 py-3">Título</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {client.proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-5 py-3 font-medium text-foreground">{proposal.title}</td>
                      <td className="px-5 py-3">
                        <Badge tone={PROPOSAL_TONES[proposal.status]}>{PROPOSAL_LABELS[proposal.status]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-foreground">
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
        <h2 id="client-invoices-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Facturas
        </h2>
        {client.invoices.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <EmptyState icon={Receipt} title="Sin facturas" description="Este cliente todavía no tiene facturas." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <caption className="sr-only">Facturas emitidas a este cliente, con su saldo pendiente</caption>
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th scope="col" className="px-5 py-3">Proyecto</th>
                    <th scope="col" className="px-5 py-3">Descripción</th>
                    <th scope="col" className="px-5 py-3">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {client.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-5 py-3 font-medium text-foreground">{invoice.project_title}</td>
                      <td className="px-5 py-3 text-foreground/70 truncate max-w-xs">{invoice.description}</td>
                      <td className="px-5 py-3">
                        <Badge tone={INVOICE_TONES[invoice.status]}>{INVOICE_LABELS[invoice.status]}</Badge>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-mono font-bold ${
                          invoice.balance > 0 ? "text-amber-700" : "text-foreground/50"
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
