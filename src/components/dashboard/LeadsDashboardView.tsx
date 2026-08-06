"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users,
  Search,
  RefreshCw,
  LogOut,
  Download,
  X,
  Copy,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  Code2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { toCsvCell } from "@/lib/utils";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  budget?: string;
  currency?: string;
  estimated_weeks?: number;
  message?: string;
  notes?: string;
  source?: string;
  status: "Nuevo" | "En Cotización" | "Ganado" | "Perdido";
  created_at: string;
}

export interface Sprint {
  id: number;
  title: string;
  status: "Completado" | "En Progreso" | "Pendiente";
  progress: number;
}

export interface Project {
  id: number;
  client_email: string;
  title: string;
  description?: string;
  progress: number;
  repo_url?: string;
  staging_url?: string;
  sla_warranty_start?: string;
  sla_warranty_end?: string;
  status: "Planificación" | "En Desarrollo" | "Fase QA" | "Entregado" | "Garantía SLA";
  created_at: string;
  sprints: Sprint[];
}

interface DashboardData {
  user: { name: string; email: string; role: string };
  leads?: Lead[];
  projects?: Project[];
}

async function loadDashboardData(router: ReturnType<typeof useRouter>): Promise<DashboardData | null> {
  try {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) {
      router.push("/login");
      return null;
    }
    const meData = await meRes.json();

    let leads: Lead[] | undefined;
    if (meData.user.role === "admin") {
      const leadsRes = await fetch("/api/leads");
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        leads = data.leads || [];
      }
    }

    let projects: Project[] | undefined;
    const projectsRes = await fetch("/api/projects");
    if (projectsRes.ok) {
      const data = await projectsRes.json();
      projects = data.projects || [];
    }

    return { user: meData.user, leads, projects };
  } catch (err) {
    console.error("Error al cargar datos:", err);
    return null;
  }
}

export function LeadsDashboardView() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "projects">("leads");
  const [loading, setLoading] = useState(true);
  
  // States para Leads
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeNotes, setActiveNotes] = useState<string>("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // User Session
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  // Paginación de Leads
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reloj para los badges de SLA — Date.now() no puede llamarse durante el render
  // (react-hooks/purity), así que se lee una sola vez por tick dentro de un efecto.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const applyDashboardData = useCallback((result: DashboardData) => {
    setUser(result.user);
    if (result.user.role !== "admin") setActiveTab("projects");
    if (result.leads) setLeads(result.leads);
    if (result.projects) setProjects(result.projects);
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    loadDashboardData(router).then((result) => {
      if (ignore || result === null) return;
      applyDashboardData(result);
    });
    return () => {
      ignore = true;
    };
  }, [router, applyDashboardData]);

  const handleManualRefresh = async () => {
    setLoading(true);
    const result = await loadDashboardData(router);
    if (result !== null) applyDashboardData(result);
    else setLoading(false);
  };

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

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedLead.id, notes: activeNotes }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === selectedLead.id ? { ...lead, notes: activeNotes } : lead))
        );
        setSelectedLead((prev) => (prev ? { ...prev, notes: activeNotes } : null));
      }
    } catch (err) {
      console.error("Error al guardar notas:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Exportar Leads a CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const headers = ["ID", "Nombre", "Email", "Telefono", "Servicio", "Presupuesto", "Moneda", "Semanas", "Origen", "Estado", "Fecha", "Notas"];
    const rows = filteredLeads.map((l) => [
      String(l.id),
      toCsvCell(l.name || ""),
      toCsvCell(l.email || ""),
      toCsvCell(l.phone || ""),
      toCsvCell(l.service || ""),
      toCsvCell(l.budget || ""),
      toCsvCell(l.currency || "COP"),
      String(l.estimated_weeks || 4),
      toCsvCell(l.source || ""),
      toCsvCell(l.status),
      new Date(l.created_at).toISOString(),
      toCsvCell(l.notes || ""),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prospectos_skycode_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSLABadge = (createdAt: string, status: string) => {
    if (status !== "Nuevo" || now === null) return null;
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

  // Filtrado de leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.service && lead.service.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Paginación calculada con safety clamp si currentPage está fuera de rango
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Métricas
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter((l) => l.status === "Nuevo").length;
  const wonLeadsCount = leads.filter((l) => l.status === "Ganado").length;

  return (
    <div className="min-h-screen bg-foreground text-background">
      {/* Header Bar */}
      <header className="border-b border-background/10 bg-background/5 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="h-4 w-px bg-background/20" />
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent">
              SKYCODE Command Center
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-background/80 font-mono">
                <ShieldCheck size={14} className="text-green-400" />
                <span>{user.name}</span>
                <span className="rounded bg-background/10 px-1.5 py-0.5 text-[10px] uppercase text-background/60">
                  {user.role}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-background/15 px-3 py-1.5 text-xs text-background/80 hover:bg-background/10 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        
        {/* Tab switcher (Only visible for Admins) */}
        {user?.role === "admin" && (
          <div className="flex border-b border-background/15 gap-6">
            <button
              onClick={() => setActiveTab("leads")}
              className={`flex items-center gap-1.5 pb-3.5 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
                activeTab === "leads"
                  ? "border-accent text-accent font-bold"
                  : "border-transparent text-background/50 hover:text-background"
              }`}
            >
              <TrendingUp size={15} />
              Leads y Ventas
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-1.5 pb-3.5 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
                activeTab === "projects"
                  ? "border-accent text-accent font-bold"
                  : "border-transparent text-background/50 hover:text-background"
              }`}
            >
              <Layers size={15} />
              Gestión de Proyectos
            </button>
          </div>
        )}

        {/* Tab 1: Leads and Sales (CRM) */}
        {activeTab === "leads" && user?.role === "admin" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-background">Prospectos y Cotizaciones Recibidas</h1>
                <p className="mt-1 text-xs text-background/70 font-sans">
                  Base de datos PostgreSQL en Render — Leads capturados en tiempo real
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  disabled={leads.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-background/20 bg-background/5 px-4 py-2 text-xs font-medium text-background hover:bg-background/15 transition-all disabled:opacity-40"
                >
                  <Download size={14} />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  <span>Actualizar Datos</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SpotlightCard>
                <div className="rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-background/60">
                    <span>Total Cotizaciones</span>
                    <Users size={18} className="text-accent" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-background">{totalLeads}</div>
                  <div className="text-[10px] text-background/50">Capturados en plataforma</div>
                </div>
              </SpotlightCard>

              <SpotlightCard>
                <div className="rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-background/60">
                    <span>Leads Nuevos</span>
                    <Clock size={18} className="text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400">{newLeadsCount}</div>
                  <div className="text-[10px] text-amber-400/70">Requieren contacto prioritario</div>
                </div>
              </SpotlightCard>

              <SpotlightCard>
                <div className="rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-background/60">
                    <span>Clientes Ganados</span>
                    <CheckCircle2 size={18} className="text-green-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-green-400">{wonLeadsCount}</div>
                  <div className="text-[10px] text-green-400/70">Proyectos en desarrollo</div>
                </div>
              </SpotlightCard>

              <SpotlightCard>
                <div className="rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-background/60">
                    <span>Base de Datos</span>
                    <TrendingUp size={18} className="text-sky-400" />
                  </div>
                  <div className="text-sm font-bold font-mono text-sky-400 truncate">PostgreSQL Render</div>
                  <div className="text-[10px] text-background/50">Conexión cifrada SSL</div>
                </div>
              </SpotlightCard>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/5 border border-background/15 p-4 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/60" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por cliente, email o servicio..."
                  className="w-full rounded-xl border border-background/15 bg-background/10 py-2 pl-10 pr-4 text-xs text-background placeholder:text-background/40 outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal size={14} className="text-background/60" />
                <span className="text-xs text-background/60 font-mono">Estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
                >
                  <option value="ALL" className="bg-foreground text-background">Todos los estados</option>
                  <option value="Nuevo" className="bg-foreground text-background">Nuevo</option>
                  <option value="En Cotización" className="bg-foreground text-background">En Cotización</option>
                  <option value="Ganado" className="bg-foreground text-background">Ganado</option>
                  <option value="Perdido" className="bg-foreground text-background">Perdido</option>
                </select>
              </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-hidden rounded-2xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw size={24} className="animate-spin text-accent mx-auto" />
                  <p className="text-xs text-background/60">Cargando prospectos desde PostgreSQL...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Users size={32} className="text-background/30 mx-auto" />
                  <h3 className="text-sm font-bold text-background">No se encontraron prospectos</h3>
                  <p className="text-xs text-background/60">Intente ajustar los filtros de búsqueda</p>
                </div>
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
                          <th className="px-5 py-3.5">Origen</th>
                          <th className="px-5 py-3.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-background/10">
                        {paginatedLeads.map((lead) => {
                          const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9+]/g, "") : "";
                          const waText = encodeURIComponent(
                            `Hola ${lead.name}, te contactamos desde SKYCODE Agency respecto a tu cotización de ${lead.service || "software"}.`
                          );
                          const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null;

                          return (
                            <tr
                              key={lead.id}
                              onClick={() => {
                                setSelectedLead(lead);
                                setActiveNotes(lead.notes || "");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedLead(lead);
                                  setActiveNotes(lead.notes || "");
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              className="hover:bg-background/10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                            >
                              <td className="px-5 py-4">
                                <div className="font-bold text-background flex items-center gap-2">
                                  <span>{lead.name}</span>
                                  {lead.notes && (
                                    <span title="Tiene notas internas">
                                      <FileText size={12} className="text-accent shrink-0" />
                                    </span>
                                  )}
                                </div>
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
                                  <option value="Nuevo" className="bg-foreground text-background">Nuevo</option>
                                  <option value="En Cotización" className="bg-foreground text-background">En Cotización</option>
                                  <option value="Ganado" className="bg-foreground text-background">Ganado</option>
                                  <option value="Perdido" className="bg-foreground text-background">Perdido</option>
                                </select>
                              </td>

                              <td className="px-5 py-4 font-mono text-[10px] text-background/60">
                                {lead.source || "Web Directo"}
                              </td>

                              <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                {waUrl ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-[11px] font-semibold text-green-400 hover:bg-green-500/30 transition-colors"
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
                      Mostrando {((safeCurrentPage - 1) * pageSize) + 1} a {Math.min(safeCurrentPage * pageSize, filteredLeads.length)} de {filteredLeads.length} registros
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span>Página {safeCurrentPage} de {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Project Management / Client Portal */}
        {activeTab === "projects" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-background">Portal de Proyectos &amp; Avances</h1>
                <p className="mt-1 text-xs text-background/70 font-sans">
                  Monitoree el avance, sprints entregables y links de despliegue en tiempo real.
                </p>
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-accent-strong transition-all"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Actualizar Avances</span>
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-accent mx-auto" />
                <p className="text-xs text-background/60">Obteniendo estado del proyecto...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="py-20 text-center space-y-2 rounded-2xl border border-background/15 bg-background/5">
                <AlertCircle size={32} className="text-background/30 mx-auto" />
                <h3 className="text-sm font-bold text-background">Ningún proyecto asociado</h3>
                <p className="text-xs text-background/60">No encontramos proyectos asignados a esta cuenta actualmente.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-background/15 bg-background/5 p-6 backdrop-blur-2xl shadow-2xl space-y-6"
                  >
                    {/* Project Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-background/10 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-background">{project.title}</h2>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            project.status === "En Desarrollo"
                              ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                              : project.status === "Fase QA"
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                              : project.status === "Garantía SLA"
                              ? "bg-green-500/10 border border-green-500/20 text-green-400"
                              : "bg-background/20 text-background/60"
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-background/70 mt-1">{project.description}</p>
                        )}
                        <p className="text-[10px] text-background/40 font-mono mt-1">Cliente: {project.client_email}</p>
                      </div>

                      {/* Repos and Staging Action links */}
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {project.repo_url && (
                          <a
                            href={project.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-background/15 bg-background/10 px-3 py-1.5 text-xs text-background hover:bg-background/20 transition-colors"
                          >
                            <Code2 size={14} />
                            <span>Repositorio</span>
                          </a>
                        )}
                        {project.staging_url && (
                          <a
                            href={project.staging_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-accent-strong transition-colors"
                          >
                            <Layers size={14} />
                            <span>Entorno Staging</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Overall Progress Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Progreso General del Software:</span>
                        <span className="font-mono text-accent font-bold">{project.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-background/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-sky-400 transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Sprints Board */}
                    <div className="space-y-4 pt-4 border-t border-background/10">
                      <h3 className="text-xs font-mono font-bold text-background/60 uppercase tracking-wider">
                        Sprints de Desarrollo &amp; Entregables
                      </h3>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {project.sprints && project.sprints.map((sprint) => (
                          <div
                            key={sprint.id}
                            className="rounded-xl border border-background/10 bg-background/5 p-4 flex flex-col justify-between gap-3 hover:border-background/25 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-background leading-tight">{sprint.title}</span>
                              <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                                sprint.status === "Completado"
                                  ? "bg-green-500/10 text-green-400"
                                  : sprint.status === "En Progreso"
                                  ? "bg-sky-500/10 text-sky-400"
                                  : "bg-background/20 text-background/50"
                              }`}>
                                {sprint.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-background/50">
                                <span>Avance</span>
                                <span>{sprint.progress}%</span>
                              </div>
                              <div className="h-1 w-full bg-background/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    sprint.status === "Completado" ? "bg-green-400" : "bg-sky-400"
                                  }`}
                                  style={{ width: `${sprint.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SLA Warranty Info Banner */}
                    {project.status === "Garantía SLA" && (
                      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck size={20} className="text-green-400 shrink-0" />
                          <div>
                            <strong className="text-green-400 block font-semibold">Garantía Post-Entrega de 90 Días SLA Activa</strong>
                            <span className="text-[11px] text-background/60">Cero bugs cubierto a nivel de infraestructura y código.</span>
                          </div>
                        </div>
                        {project.sla_warranty_start && project.sla_warranty_end && (
                          <div className="flex items-center gap-1.5 text-green-400/90 font-mono text-[10px] shrink-0 border border-green-500/20 rounded-lg p-2 bg-green-500/5">
                            <Calendar size={12} />
                            <span>Vence: {new Date(project.sla_warranty_end).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slide-over Drawer for Lead Detail & Internal Notes */}
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
                    className="rounded-full p-1 text-background/60 hover:bg-background/10 hover:text-background transition-colors"
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

                <div className="rounded-2xl border border-background/15 bg-background/5 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-background/60">Correo Electrónico:</span>
                    <button
                      onClick={() => handleCopy(selectedLead.email, "email")}
                      className="flex items-center gap-1 font-mono text-accent hover:underline"
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
                        className="flex items-center gap-1 font-mono text-accent hover:underline"
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
                    <div className="rounded-2xl border border-background/15 bg-background/10 p-4 text-xs font-mono whitespace-pre-wrap text-background/90 max-h-48 overflow-y-auto">
                      {selectedLead.message}
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-t border-background/10 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-background/80 flex items-center gap-1.5">
                      <FileText size={14} className="text-accent" />
                      <span>Notas Internas del Equipo Comercial</span>
                    </label>
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="flex items-center gap-1 rounded-lg bg-accent/20 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all disabled:opacity-50"
                    >
                      <Save size={12} />
                      <span>{isSavingNotes ? "Guardando..." : "Guardar Nota"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={activeNotes}
                    onChange={(e) => setActiveNotes(e.target.value)}
                    placeholder="Escriba llamadas realizadas, cotizaciones enviadas, objeciones o acuerdos comerciales..."
                    className="w-full rounded-xl border border-background/15 bg-background/10 p-3 text-xs text-background placeholder:text-background/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
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
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-green-400 transition-all"
                  >
                    <span>Abrir Chat en WhatsApp</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-xl border border-background/20 px-4 py-2.5 text-xs font-medium text-background/80 hover:bg-background/10 transition-colors"
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
