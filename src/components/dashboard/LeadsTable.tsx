"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  AlertCircle,
  UserCog,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { EmptyState } from "./EmptyState";
import type { Lead, LeadActivity, LeadActivityType, LeadOwner } from "./types";

const STATUS_OPTIONS: Lead["status"][] = ["Nuevo", "En Cotización", "Ganado", "Perdido"];

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
  owners: LeadOwner[];
  stats: { total: number; newCount: number; wonCount: number };
}

export function LeadsTable({ leads: initialLeads, total, page, pageSize, q, status, owners, stats }: LeadsTableProps) {
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

  const pushQuery = (overrides: Partial<{ q: string; status: string; page: number }>) => {
    const nextQ = overrides.q ?? q;
    const nextStatus = overrides.status ?? status;
    const resetPage = overrides.q !== undefined || overrides.status !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));

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
      console.error("Error al actualizar estado:", err);
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
      console.error("Error al reasignar prospecto:", err);
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
      console.error("Error al registrar actividad:", err);
    } finally {
      setIsAddingActivity(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getSLABadge = (createdAt: string, leadStatus: string) => {
    if (leadStatus !== "Nuevo" || now === null) return null;
    const diffHours = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
          <CheckCircle2 size={11} />
          Respuesta Inmediata (&lt;2h)
        </span>
      );
    }
    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
          <Clock size={11} />
          Atención Requerida Hoy
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">
        <AlertCircle size={11} />
        SLA Vencido (&gt;24h)
      </span>
    );
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status !== "ALL") exportParams.set("status", status);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-background">Prospectos y Cotizaciones Recibidas</h1>
          <p className="mt-1 text-xs text-background/70 font-sans">
            Base de datos PostgreSQL en Render — Leads capturados en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/leads/export${exportParams.size ? `?${exportParams}` : ""}`}
            className="flex items-center gap-2 rounded-xl border border-background/20 bg-background/5 px-4 py-2 text-xs font-medium text-background hover:bg-background/15 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </a>
          <button
            onClick={handleRefresh}
            disabled={isNavigating}
            className="flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <RefreshCw size={14} className={isNavigating ? "animate-spin" : ""} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Total Cotizaciones</span>
              <Users size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-background">{stats.total}</div>
            <div className="text-[10px] text-background/50">Capturados en plataforma</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Leads Nuevos</span>
              <Clock size={18} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">{stats.newCount}</div>
            <div className="text-[10px] text-amber-400/70">Requieren contacto prioritario</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Clientes Ganados</span>
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-green-400">{stats.wonCount}</div>
            <div className="text-[10px] text-green-400/70">Proyectos en desarrollo</div>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>Base de Datos</span>
              <TrendingUp size={18} className="text-sky-400" />
            </div>
            <div className="text-sm font-bold font-mono text-sky-400 truncate">PostgreSQL Render</div>
            <div className="text-[10px] text-background/50">Conexión cifrada SSL</div>
          </div>
        </SpotlightCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/5 border border-background/15 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por cliente, email o servicio..."
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2 pl-10 pr-4 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal size={14} className="text-background/60" />
          <span className="text-xs text-background/60 font-mono">Estado:</span>
          <select
            value={status}
            onChange={(e) => pushQuery({ status: e.target.value })}
            className="rounded-xl border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
          >
            <option value="ALL" className="bg-foreground text-background">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-foreground text-background">{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron prospectos"
            description={stats.total === 0 ? "Todavía no hay leads registrados." : "Intente ajustar los filtros de búsqueda."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-background/90">
                <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                  <tr>
                    <th className="px-5 py-3.5">Cliente / Email</th>
                    <th className="px-5 py-3.5">Servicio Solicitado</th>
                    <th className="px-5 py-3.5">Presupuesto</th>
                    <th className="px-5 py-3.5">SLA / Estado</th>
                    <th className="px-5 py-3.5">Dueño</th>
                    <th className="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background/10">
                  {leads.map((lead) => {
                    const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9+]/g, "") : "";
                    const waText = encodeURIComponent(
                      `Hola ${lead.name}, te contactamos desde SKYCODE Agency respecto a tu cotización de ${lead.service || "software"}.`
                    );
                    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null;

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
                        className="hover:bg-background/10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-background">{lead.name}</div>
                          <div className="text-[11px] text-background/60 font-mono">{lead.email}</div>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-medium text-background truncate">
                            {lead.service || "Desarrollo General"}
                          </div>
                          {lead.message && (
                            <div className="text-[10px] text-background/50 line-clamp-1 mt-0.5">
                              {lead.message}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-green-400">
                          {lead.budget || "A convenir"}
                        </td>

                        <td className="px-5 py-4 space-y-1">
                          <div>{getSLABadge(lead.created_at, lead.status)}</div>
                          <select
                            value={lead.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold outline-none cursor-pointer ${
                              lead.status === "Nuevo"
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                                : lead.status === "En Cotización"
                                ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                                : lead.status === "Ganado"
                                ? "border-green-400/40 bg-green-400/10 text-green-300"
                                : "border-red-400/40 bg-red-400/10 text-red-300"
                            }`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-foreground text-background">{s}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.owner?.id ?? ""}
                            onChange={(e) => handleOwnerChange(lead.id, e.target.value)}
                            className="rounded-lg border border-background/15 bg-background/10 px-2.5 py-1 text-[11px] font-semibold text-background outline-none cursor-pointer max-w-[9rem]"
                          >
                            <option value="" className="bg-foreground text-background">Sin asignar</option>
                            {owners.map((o) => (
                              <option key={o.id} value={o.id} className="bg-foreground text-background">{o.name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-[11px] font-semibold text-green-400 hover:bg-green-500/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-background/40 font-mono">Ver Detalle →</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-background/10 px-5 py-3.5 text-xs text-background/60 font-mono">
              <div>
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pushQuery({ page: page - 1 })}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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
              className="w-full max-w-lg bg-foreground border-l border-background/20 p-6 overflow-y-auto space-y-6 text-background shadow-2xl flex flex-col justify-between outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`lead-detail-${selectedLead.id}`}
              tabIndex={-1}
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-background/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-background/50">
                      Detalle de Prospecto #{selectedLead.id}
                    </span>
                    <h2 id={`lead-detail-${selectedLead.id}`} className="text-xl font-bold text-background mt-0.5">{selectedLead.name}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="rounded-full p-1 text-background/60 hover:bg-background/10 hover:text-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="rounded-xl border border-background/15 bg-background/5 p-3">
                    <span className="text-[10px] text-background/50 block">Presupuesto</span>
                    <span className="font-bold text-green-400">{selectedLead.budget || "A convenir"}</span>
                  </div>
                  <div className="rounded-xl border border-background/15 bg-background/5 p-3">
                    <span className="text-[10px] text-background/50 block">Tiempo Est.</span>
                    <span className="font-bold text-accent">{selectedLead.estimated_weeks || 4} Semanas</span>
                  </div>
                </div>

                <div className="rounded-xl border border-background/15 bg-background/5 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-background/60">Correo Electrónico:</span>
                    <button
                      onClick={() => handleCopy(selectedLead.email, "email")}
                      className="flex items-center gap-1 font-mono text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
                    >
                      <span>{selectedLead.email}</span>
                      {copiedField === "email" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center justify-between border-t border-background/10 pt-2">
                      <span className="text-background/60">Teléfono / WhatsApp:</span>
                      <button
                        onClick={() => handleCopy(selectedLead.phone || "", "phone")}
                        className="flex items-center gap-1 font-mono text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
                      >
                        <span>{selectedLead.phone}</span>
                        {copiedField === "phone" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-background/10 pt-2">
                    <span className="text-background/60">Origen de Captación:</span>
                    <span className="font-mono text-background/90">{selectedLead.source || "Web Directo"}</span>
                  </div>
                  {selectedLead.utm_source && (
                    <div className="flex items-center justify-between border-t border-background/10 pt-2">
                      <span className="text-background/60">Campaña (UTM):</span>
                      <span className="font-mono text-background/90 text-right">
                        {selectedLead.utm_source}
                        {selectedLead.utm_campaign ? ` / ${selectedLead.utm_campaign}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-background/10 pt-2">
                    <span className="text-background/60">Fecha de Registro:</span>
                    <span className="font-mono text-background/70">
                      {new Date(selectedLead.created_at).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {selectedLead.message && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-background/80">
                      Mensaje / Configuración del Cotizador
                    </label>
                    <div className="rounded-xl border border-background/15 bg-background/10 p-4 text-xs font-mono whitespace-pre-wrap text-background/90 max-h-48 overflow-y-auto">
                      {selectedLead.message}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-background/80">
                    <UserCog size={14} className="text-accent" />
                    <span>Dueño del prospecto</span>
                  </label>
                  <select
                    value={selectedLead.owner?.id ?? ""}
                    onChange={(e) => handleOwnerChange(selectedLead.id, e.target.value)}
                    className="w-full rounded-xl border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="" className="bg-foreground text-background">Sin asignar</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id} className="bg-foreground text-background">{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 border-t border-background/10 pt-4">
                  <label className="text-xs font-semibold text-background/80 flex items-center gap-1.5">
                    <History size={14} className="text-accent" />
                    <span>Historial de Interacción</span>
                  </label>

                  <div className="flex gap-2">
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value as Exclude<LeadActivityType, "status_change">)}
                      className="rounded-lg border border-background/15 bg-background/10 px-2 py-2 text-xs text-background outline-none focus:border-accent cursor-pointer shrink-0"
                    >
                      <option value="note" className="bg-foreground text-background">Nota</option>
                      <option value="call" className="bg-foreground text-background">Llamada</option>
                      <option value="email" className="bg-foreground text-background">Correo</option>
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
                      className="flex-1 min-w-0 rounded-lg border border-background/15 bg-background/10 px-3 py-2 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent"
                    />
                    <button
                      onClick={handleAddActivity}
                      disabled={isAddingActivity || !newActivityBody.trim()}
                      className="rounded-lg bg-accent/20 border border-accent/30 px-3 py-2 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all disabled:opacity-50 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activitiesLoading ? (
                      <p className="text-[11px] text-background/50 text-center py-4">Cargando historial...</p>
                    ) : activities.length === 0 ? (
                      <p className="text-[11px] text-background/50 text-center py-4">Sin actividad registrada todavía.</p>
                    ) : (
                      activities.map((activity) => {
                        const Icon = ACTIVITY_ICONS[activity.type];
                        return (
                          <div key={activity.id} className="rounded-xl border border-background/10 bg-background/5 p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 font-semibold text-background/80">
                                <Icon size={12} className="text-accent" />
                                {ACTIVITY_LABELS[activity.type]}
                              </span>
                              <span className="text-[10px] text-background/50 font-mono">
                                {new Date(activity.created_at).toLocaleString("es-CO")}
                              </span>
                            </div>
                            <p className="text-background/90 whitespace-pre-wrap">{activity.body}</p>
                            {activity.actor_name && (
                              <p className="text-[10px] text-background/40 mt-1">— {activity.actor_name}</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-background/10 flex items-center gap-3">
                {selectedLead.phone && (
                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(
                      `Hola ${selectedLead.name}, te escribo de SKYCODE respecto a tu requerimiento de ${selectedLead.service || "software"}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-green-400 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  >
                    <span>Abrir Chat en WhatsApp</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-xl border border-background/20 px-4 py-2.5 text-xs font-medium text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
