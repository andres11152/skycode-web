"use client";

import { Fragment, useState, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { History, Search, ChevronLeft, ChevronRight, ChevronDown, User } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { AuditLogEntry } from "./types";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  action: string;
  actions: string[];
}

function actionBadgeClass(action: string): string {
  if (action.endsWith(".delete") || action.endsWith(".reject")) {
    return "bg-red-500/10 border border-red-500/20 text-red-400";
  }
  if (action.endsWith(".create") || action.endsWith(".accept") || action === "user.login") {
    return "bg-green-500/10 border border-green-500/20 text-green-400";
  }
  return "bg-sky-500/10 border border-sky-500/20 text-sky-400";
}

export function AuditLogTable({ entries, total, page, pageSize, q, action, actions }: AuditLogTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();

  const [searchInput, setSearchInput] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchInput(q);
  }

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = (overrides: Partial<{ q: string; action: string; page: number }>) => {
    const nextQ = overrides.q ?? q;
    const nextAction = overrides.action ?? action;
    const resetPage = overrides.q !== undefined || overrides.action !== undefined;
    const nextPage = overrides.page ?? (resetPage ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextAction !== "ALL") params.set("action", nextAction);
    if (nextPage > 1) params.set("page", String(nextPage));

    startNavigation(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => pushQuery({ q: value }), 400);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-background">Auditoría</h1>
        <p className="mt-1 text-xs text-background/70 font-sans">
          Bitácora de cambios del sistema — quién hizo qué, cuándo, y con qué contenido anterior/nuevo
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/5 border border-background/15 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/60" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por actor o entidad..."
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2 pl-10 pr-4 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-background/60 font-mono">Acción:</span>
          <select
            value={action}
            onChange={(e) => pushQuery({ action: e.target.value })}
            className="rounded-xl border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
          >
            <option value="ALL" className="bg-foreground text-background">Todas las acciones</option>
            {actions.map((a) => (
              <option key={a} value={a} className="bg-foreground text-background">{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sin entradas de auditoría"
            description={total === 0 ? "Todavía no hay actividad registrada." : "Intente ajustar los filtros de búsqueda."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-background/90">
                <caption className="sr-only">Bitácora de auditoría del sistema, con actor, acción y contenido del cambio</caption>
                <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Actor</th>
                    <th scope="col" className="px-5 py-3.5">Acción</th>
                    <th scope="col" className="px-5 py-3.5">Entidad</th>
                    <th scope="col" className="px-5 py-3.5">IP</th>
                    <th scope="col" className="px-5 py-3.5">Fecha</th>
                    <th scope="col" className="px-5 py-3.5 sr-only">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background/10">
                  {entries.map((entry) => {
                    const isExpanded = expandedId === entry.id;
                    return (
                      <Fragment key={entry.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedId(isExpanded ? null : entry.id);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-expanded={isExpanded}
                          className="hover:bg-background/10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <User size={12} className="text-background/40 shrink-0" />
                              <span className="font-mono truncate max-w-[180px]">
                                {entry.actor_email || "Sistema / público"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${actionBadgeClass(entry.action)}`}>
                              {entry.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-background/70">
                            {entry.entity_type}
                            {entry.entity_id ? `#${entry.entity_id}` : ""}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-background/50">{entry.ip || "—"}</td>
                          <td className="px-5 py-3.5 font-mono text-background/50 whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <ChevronDown
                              size={14}
                              className={`text-background/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-background/[0.03] px-5 py-4">
                              {entry.diff ? (
                                <pre className="overflow-x-auto rounded-lg bg-background/10 p-3 text-[11px] leading-relaxed text-background/80 font-mono">
                                  {JSON.stringify(entry.diff, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-[11px] text-background/50">Sin contenido adicional para esta entrada.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
                  disabled={page === 1 || isNavigating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {page} de {totalPages}</span>
                <button
                  onClick={() => pushQuery({ page: page + 1 })}
                  disabled={page === totalPages || isNavigating}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-background/15 hover:bg-background/10 disabled:opacity-30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
