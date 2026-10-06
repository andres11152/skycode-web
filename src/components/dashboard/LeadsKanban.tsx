"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { buildLeadWhatsappUrl } from "@/lib/leadWhatsapp";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_STYLES, getSlaBadge, getFollowUpBadge } from "./leadShared";
import type { Lead } from "./types";

/**
 * Vista de tablero para Leads y Ventas — alternativa visual a `LeadsTable`
 * (tabla), no un reemplazo: usa los MISMOS datos ya cargados (`leads`
 * sin paginar en esta vista, ver page.tsx) y los mismos callbacks de
 * cambio de estado/apertura de detalle que la tabla, así que nunca hay
 * una segunda fuente de verdad para "qué puede hacer un lead".
 *
 * Arrastrar y soltar es un atajo de mouse sobre un camino que YA es
 * accesible sin él: cada tarjeta abre el mismo panel de detalle deslizante
 * que la fila de la tabla (con su propio `<select>` de estado, navegable
 * por teclado) — el drag-and-drop nativo (`draggable`, sin librería) es
 * puramente adicional, nunca la única forma de mover un lead entre
 * columnas.
 */
export function LeadsKanban({
  leads,
  onOpenLead,
  onStatusChange,
  now,
  todayIso,
  canDrag,
}: {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onStatusChange: (id: number, status: string) => void;
  now: number | null;
  todayIso: string;
  canDrag: boolean;
}) {
  const [dragOverStatus, setDragOverStatus] = useState<Lead["status"] | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleDrop = (status: Lead["status"]) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOverStatus(null);
    const idRaw = event.dataTransfer.getData("text/plain");
    const id = Number(idRaw);
    if (!Number.isInteger(id)) return;
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.status !== status) onStatusChange(id, status);
  };

  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4"
      role="group" aria-label="Tablero de leads por estado"
    >
      {LEAD_STATUS_OPTIONS.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);
        const styles = LEAD_STATUS_STYLES[status];
        const isDragOver = dragOverStatus === status;

        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              if (dragOverStatus !== status) setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus((prev) => (prev === status ? null : prev))}
            onDrop={canDrag ? handleDrop(status) : undefined}
            className={`flex min-h-[200px] w-[82vw] max-w-xs shrink-0 snap-center flex-col gap-3 rounded-xl border p-3 transition-colors sm:w-auto sm:max-w-none ${
              isDragOver ? "border-accent bg-accent/5" : "border-foreground/10 bg-foreground/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
                <h3 className="text-xs font-bold text-foreground">{status}</h3>
              </div>
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-foreground/70">
                {columnLeads.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {columnLeads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-foreground/15 px-3 py-6 text-center text-xs text-foreground/70">
                  Sin prospectos
                </p>
              ) : (
                columnLeads.map((lead) => {
                  const waUrl = buildLeadWhatsappUrl(lead);
                  return (
                    <div
                      key={lead.id}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        setDraggingId(lead.id);
                        e.dataTransfer.setData("text/plain", String(lead.id));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => onOpenLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenLead(lead);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer space-y-2 rounded-lg border bg-background p-3 text-left shadow-sm shadow-black/5 transition-all hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        styles.accent
                      } ${draggingId === lead.id ? "opacity-40" : ""}`}
                    >
                      <div>
                        <p className="truncate text-xs font-bold text-foreground">{lead.name}</p>
                        <p className="truncate font-mono text-[11px] text-foreground/70">{lead.email}</p>
                      </div>
                      <p className="truncate text-[11px] text-foreground/70">{lead.service || "Sin especificar"}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-success">{lead.budget || "A convenir"}</span>
                        {lead.owner && (
                          <span className="truncate rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
                            {lead.owner.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getSlaBadge(lead.created_at, lead.status, now)}
                        {getFollowUpBadge(lead, todayIso)}
                      </div>
                      {/* Arrastrar no existe con el dedo: en pantallas táctiles cada tarjeta
                          trae su propio selector "Mover a…" (mismo callback que el arrastre). */}
                      {canDrag && (
                        <label className="hidden items-center gap-2 text-[11px] font-semibold text-foreground/70 pointer-coarse:flex" onClick={(e) => e.stopPropagation()}>
                          Mover a
                          <select
                            value={lead.status}
                            onChange={(e) => onStatusChange(lead.id, e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="min-h-11 flex-1 rounded-lg border border-foreground/15 bg-background px-2 text-xs text-foreground outline-none focus:border-accent"
                          >
                            {LEAD_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-lg bg-success/20 border border-success/30 px-2 py-1 text-[11px] font-semibold pointer-coarse:min-h-11 pointer-coarse:px-3 text-success hover:bg-success/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span>WhatsApp</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
