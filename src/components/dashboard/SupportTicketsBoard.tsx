"use client";

import { Fragment, useEffect, useId, useState } from "react";
import { Plus, X, ChevronDown, LifeBuoy, Clock, AlertTriangle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import type { ProjectOption, SupportTicket, TicketPriority, TicketStatus } from "./types";

const PRIORITY_OPTIONS: TicketPriority[] = ["Baja", "Media", "Alta", "Urgente"];
const STATUS_OPTIONS: TicketStatus[] = ["Abierto", "En Progreso", "Resuelto", "Cerrado"];

const PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  Baja: "neutral",
  Media: "info",
  Alta: "warning",
  Urgente: "danger",
};

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  Abierto: "info",
  "En Progreso": "warning",
  Resuelto: "success",
  Cerrado: "neutral",
};

function SlaBadge({ slaDueAt, status, now }: { slaDueAt: string; status: TicketStatus; now: number | null }) {
  if (status === "Resuelto" || status === "Cerrado" || now === null) return null;

  const diffMs = new Date(slaDueAt).getTime() - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">
        <AlertTriangle size={11} />
        SLA Vencido
      </span>
    );
  }
  if (diffHours < 4) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        <Clock size={11} />
        Vence en {Math.round(diffHours)}h
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-foreground/20 px-2 py-0.5 text-[10px] text-foreground/60">
      <Clock size={11} />
      Vence {new Date(slaDueAt).toLocaleDateString("es-CO")}
    </span>
  );
}

const emptyForm = { projectId: "", title: "", description: "", priority: "Media" as TicketPriority, assigneeId: "" };

export function SupportTicketsBoard({
  initialTickets,
  projects,
  teamMembers,
  canWrite,
}: {
  initialTickets: SupportTicket[];
  projects: ProjectOption[];
  teamMembers: { id: number; name: string; email: string }[];
  canWrite: boolean;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const titleId = useId();

  // Reloj para el badge de SLA — Date.now() no puede leerse durante el
  // render (react-hooks/purity), mismo patrón que LeadsTable.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleTickets = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: Number(form.projectId),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          assignee_id: form.assigneeId ? Number(form.assigneeId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el ticket.");
        return;
      }
      setTickets((prev) => [data.ticket, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const patchTicket = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === id ? data.ticket : t)));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Soporte</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Incidencias post-lanzamiento con reloj de SLA — ordenadas por vencimiento
          </p>
        </div>
        {canWrite && (
          <Button variant="accent" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nuevo ticket"}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Proyecto</label>
              <select
                required
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="" className="bg-background">Seleccione un proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-background">{p.title} — {p.client_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={titleId} className="text-xs font-medium text-foreground/70">Título</label>
              <input
                id={titleId}
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                placeholder="Ej. Error 500 al procesar pagos"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-background">{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Responsable (opcional)</label>
              <select
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="" className="bg-background">Sin asignar</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-background">{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Descripción (opcional)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
            />
          </div>
          <Button type="submit" variant="accent" disabled={isSaving}>
            {isSaving ? "Creando..." : "Crear ticket"}
          </Button>
        </form>
      )}

      <div className="flex items-center gap-2 bg-background border border-foreground/10 shadow-sm shadow-black/5 p-4 rounded-xl">
        <span className="text-xs text-foreground/60 font-mono">Estado:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "ALL")}
          className="rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
        >
          <option value="ALL" className="bg-background">Todos</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-background">{s}</option>
          ))}
        </select>
      </div>

      {visibleTickets.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState
            icon={LifeBuoy}
            title="Sin tickets"
            description={tickets.length === 0 ? "Todavía no hay incidencias registradas." : "Ningún ticket calza este filtro."}
            action={canWrite && tickets.length === 0 ? { label: "Nuevo ticket", onClick: () => setShowForm(true) } : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tickets de soporte con proyecto, prioridad, estado y SLA</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Ticket</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Prioridad</th>
                  <th scope="col" className="px-5 py-3.5">Estado</th>
                  <th scope="col" className="px-5 py-3.5">SLA</th>
                  <th scope="col" className="px-5 py-3.5 sr-only">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {visibleTickets.map((ticket) => {
                  const isExpanded = expandedId === ticket.id;
                  return (
                    <Fragment key={ticket.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedId(isExpanded ? null : ticket.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                        className="hover:bg-foreground/10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-foreground">{ticket.title}</div>
                          {ticket.assignee && (
                            <div className="text-[10px] text-foreground/50 font-mono mt-0.5">{ticket.assignee.name}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-foreground/80">{ticket.project_title}</div>
                          <div className="text-[10px] text-foreground/50 font-mono">{ticket.client_name}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={PRIORITY_TONES[ticket.priority]}>{ticket.priority}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={STATUS_TONES[ticket.status]}>{ticket.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <SlaBadge slaDueAt={ticket.sla_due_at} status={ticket.status} now={now} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ChevronDown size={14} className={`text-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-background/[0.03] px-5 py-4">
                            <div className="space-y-3 max-w-2xl">
                              {ticket.description && (
                                <p className="text-[11px] text-foreground/70 whitespace-pre-wrap">{ticket.description}</p>
                              )}

                              {canWrite ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-foreground/60">Prioridad</label>
                                    <select
                                      value={ticket.priority}
                                      onChange={(e) => patchTicket(ticket.id, { priority: e.target.value })}
                                      className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                                    >
                                      {PRIORITY_OPTIONS.map((p) => (
                                        <option key={p} value={p} className="bg-background">{p}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-foreground/60">Estado</label>
                                    <select
                                      value={ticket.status}
                                      onChange={(e) => patchTicket(ticket.id, { status: e.target.value })}
                                      className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                                    >
                                      {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s} className="bg-background">{s}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-foreground/60">Responsable</label>
                                    <select
                                      value={ticket.assignee?.id ?? ""}
                                      onChange={(e) =>
                                        patchTicket(ticket.id, { assignee_id: e.target.value ? Number(e.target.value) : null })
                                      }
                                      className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                                    >
                                      <option value="" className="bg-background">Sin asignar</option>
                                      {teamMembers.map((m) => (
                                        <option key={m.id} value={m.id} className="bg-background">{m.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ) : null}

                              {canWrite && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-medium text-foreground/60">Nota de resolución</label>
                                  <textarea
                                    rows={2}
                                    defaultValue={ticket.resolution_note ?? ""}
                                    onBlur={(e) => {
                                      if (e.target.value !== (ticket.resolution_note ?? "")) {
                                        patchTicket(ticket.id, { resolution_note: e.target.value });
                                      }
                                    }}
                                    className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                                    placeholder="Qué se hizo para resolver esta incidencia..."
                                  />
                                </div>
                              )}

                              {!canWrite && ticket.resolution_note && (
                                <p className="text-[11px] text-foreground/60">
                                  <strong className="text-foreground/80">Resolución: </strong>
                                  {ticket.resolution_note}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
