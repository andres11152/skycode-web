"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  X,
  Copy,
  Check,
  Clock,
  ExternalLink,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileText,
  Phone,
  Mail,
  History,
  CheckCircle2,
  UserCog,
  Trash2,
  AlertTriangle,
  CalendarClock,
  LayoutGrid,
  TableProperties,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "./EmptyState";
import { Button } from "./ui/Button";
import { LeadsKanban } from "./LeadsKanban";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_STYLES, getSlaBadge, getFollowUpBadge, todayIsoDate } from "./leadShared";
import { logError } from "@/lib/logger";
import { buildLeadWhatsappUrl } from "@/lib/leadWhatsapp";
import type { Lead, LeadActivity, LeadActivityType, LeadOwner } from "./types";

const ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  note: "Nota",
  call: "Llamada",
  email: "Correo",
  status_change: "Cambio de estado",
};

const ACTIVITY_ICONS: Record<LeadActivityType, typeof FileText> = {
  note: FileText,
  call: Phone,
  email: Mail,
  status_change: History,
};

interface LeadsTableProps {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  status: string;
  /** "kanban" trae TODOS los leads activos que calzan `q` sin paginar (ver page.tsx) — mismo criterio sin límite que los tableros de Soporte/Tareas. */
  view: "table" | "kanban";
  owners: LeadOwner[];
  stats: { total: number; newCount: number; wonCount: number };
  /** `leads:write` — el borrado es lógico pero saca el prospecto de la vista de todos, así que se gatea igual que editar. */
  canWrite: boolean;
}

export function LeadsTable({ leads: initialLeads, total, page, pageSize, q, status, view, owners, stats, canWrite }: LeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  // Ajusta el estado durante el render (no useEffect+setState) al llegar
  // props nuevas tras una navegación de búsqueda/filtro/página.
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
  }

  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [activities, setActivities] = useState<LeadActivity[]>([]);
  // Sin bandera `loading` propia: se deriva comparando para qué lead está
  // cargado `activities` contra el lead seleccionado — evita un setState()
  // síncrono al inicio del efecto (dispara un render en cascada).
  const [activitiesLeadId, setActivitiesLeadId] = useState<number | null>(null);
  const activitiesLoading = selectedLead !== null && activitiesLeadId !== selectedLead.id;
  const [newActivityType, setNewActivityType] = useState<Exclude<LeadActivityType, "status_change">>("note");
  const [newActivityBody, setNewActivityBody] = useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reloj para los badges de SLA — Date.now() no puede llamarse durante el
  // render (react-hooks/purity), así que se lee una sola vez por tick.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Carga el historial de actividades al abrir un lead — bajo demanda, no
  // junto al listado (traerlo para cada fila desperdiciaría queries).
  const selectedLeadId = selectedLead?.id;
  useEffect(() => {
    if (!selectedLeadId) return;
    let ignore = false;
    fetch(`/api/leads/${selectedLeadId}/activities`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setActivities(data.activities || []);
        setActivitiesLeadId(selectedLeadId);
      })
      .catch(() => {
        if (ignore) return;
        setActivities([]);
        setActivitiesLeadId(selectedLeadId);
      });
    return () => {
      ignore = true;
    };
  }, [selectedLeadId]);

  // Formulario de recordatorio de seguimiento — estado editable local
  // (fecha + nota), no controlado directo contra `selectedLead` como
  // status/owner (esos se guardan al instante en cada cambio; acá el
  // usuario escribe una nota y recién guarda con un botón, así que hace
  // falta un borrador propio). Se resetea al abrir un lead distinto
  // ajustando el estado DURANTE el render (comparando contra el id
  // anterior), no en un `useEffect` separado — mismo motivo que el
  // `ResizeObserver` de GridPattern.tsx: un efecto que reacciona a un
  // cambio para volver a llamar `setState` dispara la regla de lint
  // `react-hooks/set-state-in-effect` (estado derivado de estado vía
  // efecto); ajustarlo en el cuerpo del componente es el patrón que React
  // mismo documenta para "resetear estado cuando cambia una prop".
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpFormLeadId, setFollowUpFormLeadId] = useState<number | null>(null);
  const currentLeadId = selectedLead?.id ?? null;
  if (currentLeadId !== followUpFormLeadId) {
    setFollowUpFormLeadId(currentLeadId);
    setFollowUpDate(selectedLead?.next_follow_up_at?.slice(0, 10) ?? "");
    setFollowUpNote(selectedLead?.follow_up_note ?? "");
  }

  const handleSaveFollowUp = async () => {
    if (!selectedLead) return;
    setSavingFollowUp(true);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLead.id,
          nextFollowUpAt: followUpDate || null,
          followUpNote: followUpNote.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = { next_follow_up_at: followUpDate || null, follow_up_note: followUpNote.trim() || null };
        setLeads((prev) => prev.map((lead) => (lead.id === selectedLead.id ? { ...lead, ...updated } : lead)));
        setSelectedLead((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (err) {
      logError("Error al guardar el recordatorio de seguimiento", err);
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleClearFollowUp = async () => {
    if (!selectedLead) return;
    setFollowUpDate("");
    setFollowUpNote("");
    setSavingFollowUp(true);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedLead.id, nextFollowUpAt: null, followUpNote: null }),
      });
      if (res.ok) {
        const updated = { next_follow_up_at: null, follow_up_note: null };
        setLeads((prev) => prev.map((lead) => (lead.id === selectedLead.id ? { ...lead, ...updated } : lead)));
        setSelectedLead((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (err) {
      logError("Error al borrar el recordatorio de seguimiento", err);
    } finally {
      setSavingFollowUp(false);
    }
  };

  // Fecha (sin hora) de hoy en la zona local — función pura compartida con
  // `LeadsKanban` (ver leadShared.tsx), para no calcularla dos veces con
  // criterios que podrían desincronizarse.
  const todayIso = todayIsoDate();

  const pushQuery = (overrides: Partial<{ q: string; status: string; page: number; view: "table" | "kanban" }>) => {
    const nextQ = overrides.q ?? q;
    const nextStatus = overrides.status ?? status;
    const nextView = overrides.view ?? view;
    const resetPage = overrides.q !== undefined || overrides.status !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextView !== "table") params.set("view", nextView);

    startNavigation(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => pushQuery({ q: value }), 400);
  };

  const handleRefresh = () => startNavigation(() => router.refresh());

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus as Lead["status"] } : lead))
        );
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead((prev) => (prev ? { ...prev, status: newStatus as Lead["status"] } : null));
        }
      }
    } catch (err) {
      logError("Error al actualizar estado de prospecto", err);
    }
  };

  const handleOwnerChange = async (id: number, ownerId: string) => {
    const parsedOwnerId = ownerId ? Number(ownerId) : null;
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ownerId: parsedOwnerId }),
      });
      if (res.ok) {
        const owner = parsedOwnerId ? owners.find((o) => o.id === parsedOwnerId) || null : null;
        setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, owner } : lead)));
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead((prev) => (prev ? { ...prev, owner } : null));
        }
      }
    } catch (err) {
      logError("Error al reasignar prospecto", err);
    }
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Lead a punto de eliminarse — reemplaza el `window.confirm()` nativo
  // (feo, no respeta el sistema de diseño, sin foco atrapado) por el
  // Modal ya existente del proyecto (components/ui/Modal.tsx).
  const [leadPendingDelete, setLeadPendingDelete] = useState<Lead | null>(null);

  const handleDeleteLead = (lead: Lead) => {
    setLeadPendingDelete(lead);
  };

  const confirmDeleteLead = async () => {
    const lead = leadPendingDelete;
    if (!lead) return;

    setDeletingId(lead.id);
    try {
      // Borrado lógico (`deleted_at`), no un DELETE físico — la fila queda
      // en la base y el cambio queda registrado en audit_log, igual que el
      // resto de tablas con soft-delete del proyecto.
      const res = await fetch(`/api/leads?id=${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        setSelectedLead(null);
        router.refresh();
      }
    } catch (err) {
      logError("Error al eliminar prospecto", err);
    } finally {
      setDeletingId(null);
      setLeadPendingDelete(null);
    }
  };

  const handleAddActivity = async () => {
    if (!selectedLead || !newActivityBody.trim()) return;
    setIsAddingActivity(true);
    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newActivityType, body: newActivityBody.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivities((prev) => [data.activity, ...prev]);
        setNewActivityBody("");
      }
    } catch (err) {
      logError("Error al registrar actividad de prospecto", err);
    } finally {
      setIsAddingActivity(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status !== "ALL") exportParams.set("status", status);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Prospectos y Cotizaciones Recibidas</h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            Base de datos PostgreSQL en Render — Leads capturados en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/leads/export${exportParams.size ? `?${exportParams}` : ""}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-foreground/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </a>
          <Button variant="accent" onClick={handleRefresh} disabled={isNavigating}>
            <RefreshCw size={14} className={isNavigating ? "animate-spin" : ""} />
            <span>Actualizar Datos</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Total Cotizaciones</span>
              <Users size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">{stats.total}</div>
            <div className="text-[10px] text-foreground/50">Capturados en plataforma</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Leads Nuevos</span>
              <Clock size={18} className="text-amber-700" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700">{stats.newCount}</div>
            <div className="text-[10px] text-amber-700/70">Requieren contacto prioritario</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Clientes Ganados</span>
              <CheckCircle2 size={18} className="text-green-700" />
            </div>
            <div className="text-2xl font-bold font-mono text-green-700">{stats.wonCount}</div>
            <div className="text-[10px] text-green-700/70">Proyectos en desarrollo</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Base de Datos</span>
              <TrendingUp size={18} className="text-sky-700" />
            </div>
            <div className="text-sm font-bold font-mono text-sky-700 truncate">PostgreSQL Render</div>
            <div className="text-[10px] text-foreground/50">Conexión cifrada SSL</div>
          </div>
        </SpotlightCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background border border-foreground/10 shadow-sm shadow-black/5 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por cliente, email o servicio..."
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-foreground/60 outline-none focus:border-accent"
          />
        </div>

        {view === "table" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal size={14} className="text-foreground/60" />
            <span className="text-xs text-foreground/60 font-mono">Estado:</span>
            <select
              value={status}
              onChange={(e) => pushQuery({ status: e.target.value })}
              className="rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
            >
              <option value="ALL" className="bg-background text-foreground">Todos los estados</option>
              {LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-background text-foreground">{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tabla/Kanban — misma fila de datos, dos formas de verlos. El
            estado persiste en la URL (?view=kanban) para que un refresh o
            un link compartido conserve la vista, mismo criterio que
            q/status/page. */}
        <div className="flex items-center gap-1 rounded-xl border border-foreground/15 bg-foreground/[0.02] p-1" role="group" aria-label="Cambiar vista">
          <button
            type="button"
            onClick={() => pushQuery({ view: "table" })}
            aria-pressed={view === "table"}
            className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              view === "table" ? "bg-accent-strong text-white" : "text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            <TableProperties size={14} />
            Tabla
          </button>
          <button
            type="button"
            onClick={() => pushQuery({ view: "kanban" })}
            aria-pressed={view === "kanban"}
            className={`flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              view === "kanban" ? "bg-accent-strong text-white" : "text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron prospectos"
            description={stats.total === 0 ? "Todavía no hay leads registrados." : "Intente ajustar la búsqueda."}
          />
        ) : (
          <LeadsKanban
            leads={leads}
            onOpenLead={setSelectedLead}
            onStatusChange={handleStatusChange}
            now={now}
            todayIso={todayIso}
            canDrag={canWrite}
          />
        )
      ) : (
      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron prospectos"
            description={stats.total === 0 ? "Todavía no hay leads registrados." : "Intente ajustar los filtros de búsqueda."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                  <tr>
                    <th className="px-5 py-3.5">Cliente / Email</th>
                    <th className="px-5 py-3.5">Servicio Solicitado</th>
                    <th className="px-5 py-3.5">Presupuesto</th>
                    <th className="px-5 py-3.5">SLA / Estado</th>
                    <th className="px-5 py-3.5">Dueño</th>
                    <th className="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {leads.map((lead) => {
                    const waUrl = buildLeadWhatsappUrl(lead);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedLead(lead);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className="hover:bg-foreground/10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-foreground">{lead.name}</div>
                          <div className="text-[11px] text-foreground/60 font-mono">{lead.email}</div>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-medium text-foreground truncate">
                            {lead.service || "Sin especificar"}
                          </div>
                          {lead.message && (
                            <div className="text-[10px] text-foreground/50 line-clamp-1 mt-0.5">
                              {lead.message}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-green-700">
                          {lead.budget || "A convenir"}
                        </td>

                        <td className="px-5 py-4 space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {getSlaBadge(lead.created_at, lead.status, now)}
                            {getFollowUpBadge(lead, todayIso)}
                          </div>
                          <select
                            value={lead.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold outline-none cursor-pointer ${LEAD_STATUS_STYLES[lead.status].select}`}
                          >
                            {LEAD_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.owner?.id ?? ""}
                            onChange={(e) => handleOwnerChange(lead.id, e.target.value)}
                            className="rounded-lg border border-foreground/15 bg-foreground/10 px-2.5 py-1 text-[11px] font-semibold text-foreground outline-none cursor-pointer max-w-[9rem]"
                          >
                            <option value="" className="bg-background text-foreground">Sin asignar</option>
                            {owners.map((o) => (
                              <option key={o.id} value={o.id} className="bg-background text-foreground">{o.name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-500/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-foreground/40 font-mono">Ver Detalle →</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-foreground/10 px-5 py-3.5 text-xs text-foreground/60 font-mono">
              <div>
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pushQuery({ page: page - 1 })}
                  disabled={page === 1}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-foreground/15 hover:bg-foreground/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      <AnimatePresence>
        {selectedLead && (
          <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setSelectedLead(null)}
            role="presentation"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSelectedLead(null);
              }}
              className="w-full max-w-lg bg-background border-l border-foreground/20 p-6 overflow-y-auto space-y-6 text-foreground shadow-2xl flex flex-col justify-between outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`lead-detail-${selectedLead.id}`}
              tabIndex={-1}
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-foreground/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                      Detalle de Prospecto #{selectedLead.id}
                    </span>
                    <h2 id={`lead-detail-${selectedLead.id}`} className="text-xl font-bold text-foreground mt-0.5">{selectedLead.name}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="rounded-full p-1 text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-3">
                    <span className="text-[10px] text-foreground/50 block">Presupuesto</span>
                    <span className="font-bold text-green-700">{selectedLead.budget || "A convenir"}</span>
                  </div>
                  <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-3">
                    <span className="text-[10px] text-foreground/50 block">Tiempo Est.</span>
                    <span className="font-bold text-accent">{selectedLead.estimated_weeks || 4} Semanas</span>
                  </div>
                </div>

                <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">Correo Electrónico:</span>
                    <button
                      onClick={() => handleCopy(selectedLead.email, "email")}
                      className="flex items-center gap-1 font-mono text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    >
                      <span>{selectedLead.email}</span>
                      {copiedField === "email" ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                    </button>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center justify-between border-t border-foreground/10 pt-2">
                      <span className="text-foreground/60">Teléfono / WhatsApp:</span>
                      <button
                        onClick={() => handleCopy(selectedLead.phone || "", "phone")}
                        className="flex items-center gap-1 font-mono text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                      >
                        <span>{selectedLead.phone}</span>
                        {copiedField === "phone" ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-foreground/10 pt-2">
                    <span className="text-foreground/60">Origen de Captación:</span>
                    <span className="font-mono text-foreground/90">{selectedLead.source || "Sin especificar"}</span>
                  </div>
                  {selectedLead.utm_source && (
                    <div className="flex items-center justify-between border-t border-foreground/10 pt-2">
                      <span className="text-foreground/60">Campaña (UTM):</span>
                      <span className="font-mono text-foreground/90 text-right">
                        {selectedLead.utm_source}
                        {selectedLead.utm_campaign ? ` / ${selectedLead.utm_campaign}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-foreground/10 pt-2">
                    <span className="text-foreground/60">Fecha de Registro:</span>
                    <span className="font-mono text-foreground/70">
                      {new Date(selectedLead.created_at).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {selectedLead.message && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground/80">
                      Mensaje / Configuración del Cotizador
                    </label>
                    <div className="rounded-xl border border-foreground/15 bg-foreground/10 p-4 text-xs font-mono whitespace-pre-wrap text-foreground/90 max-h-48 overflow-y-auto">
                      {selectedLead.message}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                    <UserCog size={14} className="text-accent" />
                    <span>Dueño del prospecto</span>
                  </label>
                  <select
                    value={selectedLead.owner?.id ?? ""}
                    onChange={(e) => handleOwnerChange(selectedLead.id, e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2 px-3 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="" className="bg-background text-foreground">Sin asignar</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id} className="bg-background text-foreground">{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                    <CalendarClock size={14} className="text-accent" />
                    <span>Próximo seguimiento</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="rounded-lg border border-foreground/15 bg-foreground/[0.02] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    />
                    {selectedLead.next_follow_up_at && (
                      <button
                        type="button"
                        onClick={handleClearFollowUp}
                        disabled={savingFollowUp}
                        aria-label="Borrar recordatorio"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/50 hover:bg-red-500/10 hover:text-red-700 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Nota para cuando toque recontactar (opcional)"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3 py-2 text-xs text-foreground placeholder:text-foreground/40 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveFollowUp}
                    disabled={savingFollowUp || !followUpDate}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent-strong px-3.5 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {savingFollowUp ? "Guardando…" : "Guardar recordatorio"}
                  </button>
                </div>

                <div className="space-y-3 border-t border-foreground/10 pt-4">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <History size={14} className="text-accent" />
                    <span>Historial de Interacción</span>
                  </label>

                  <div className="flex gap-2">
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value as Exclude<LeadActivityType, "status_change">)}
                      className="rounded-lg border border-foreground/15 bg-foreground/10 px-2 py-2 text-xs text-foreground outline-none focus:border-accent cursor-pointer shrink-0"
                    >
                      <option value="note" className="bg-background text-foreground">Nota</option>
                      <option value="call" className="bg-background text-foreground">Llamada</option>
                      <option value="email" className="bg-background text-foreground">Correo</option>
                    </select>
                    <input
                      type="text"
                      value={newActivityBody}
                      onChange={(e) => setNewActivityBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddActivity();
                        }
                      }}
                      placeholder="Registrar llamada, correo enviado o nota..."
                      className="flex-1 min-w-0 rounded-lg border border-foreground/15 bg-foreground/10 px-3 py-2 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
                    />
                    <button
                      onClick={handleAddActivity}
                      disabled={isAddingActivity || !newActivityBody.trim()}
                      className="rounded-lg bg-accent/20 border border-accent/30 px-3 py-2 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all disabled:opacity-50 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activitiesLoading ? (
                      <p className="text-[11px] text-foreground/50 text-center py-4">Cargando historial...</p>
                    ) : activities.length === 0 ? (
                      <p className="text-[11px] text-foreground/50 text-center py-4">Sin actividad registrada todavía.</p>
                    ) : (
                      activities.map((activity) => {
                        const Icon = ACTIVITY_ICONS[activity.type];
                        return (
                          <div key={activity.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
                                <Icon size={12} className="text-accent" />
                                {ACTIVITY_LABELS[activity.type]}
                              </span>
                              <span className="text-[10px] text-foreground/50 font-mono">
                                {new Date(activity.created_at).toLocaleString("es-CO")}
                              </span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap">{activity.body}</p>
                            {activity.actor_name && (
                              <p className="text-[10px] text-foreground/40 mt-1">— {activity.actor_name}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-foreground/10 flex items-center gap-3">
                {buildLeadWhatsappUrl(selectedLead) && (
                  <a
                    href={buildLeadWhatsappUrl(selectedLead)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-green-400 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span>Abrir Chat en WhatsApp</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {canWrite && (
                  <button
                    onClick={() => handleDeleteLead(selectedLead)}
                    disabled={deletingId === selectedLead.id}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-medium text-red-700 hover:bg-red-500/10 transition-colors disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Trash2 size={14} />
                    <span>{deletingId === selectedLead.id ? "Eliminando…" : "Eliminar"}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="min-h-11 rounded-xl border border-foreground/20 px-4 py-2.5 text-xs font-medium text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmación de borrado — reemplaza window.confirm() por el Modal
          del sistema de diseño (glass, foco atrapado, Escape, animación
          consistente con el resto del proyecto). */}
      <Modal
        open={leadPendingDelete !== null}
        onClose={() => setLeadPendingDelete(null)}
        title="Eliminar prospecto"
        closeLabel="Cerrar"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
              <AlertTriangle size={18} />
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              ¿Eliminar a{" "}
              <span className="font-semibold text-foreground">{leadPendingDelete?.name}</span>? Sale del
              listado y deja de contar en las métricas. Esta acción no se puede deshacer desde el CRM.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLeadPendingDelete(null)}
              className="inline-flex min-h-11 items-center rounded-xl border border-foreground/20 px-4 py-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteLead}
              disabled={deletingId === leadPendingDelete?.id}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Trash2 size={14} />
              <span>{deletingId === leadPendingDelete?.id ? "Eliminando…" : "Eliminar definitivamente"}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
