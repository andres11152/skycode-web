import { CheckCircle2, Clock, AlertCircle, CalendarClock } from "lucide-react";
import { Badge } from "./ui/Badge";
import type { Lead } from "./types";

/**
 * Compartido entre `LeadsTable` (vista de tabla) y `LeadsKanban` (vista de
 * tablero) — antes vivía solo dentro de `LeadsTable.tsx` como funciones
 * internas que cerraban sobre `now`/`todayIso` del componente; acá son
 * funciones puras que reciben esos valores como parámetro, para que ambas
 * vistas los calculen una sola vez arriba y no dupliquen la lógica de SLA
 * ni de recordatorio de seguimiento.
 */
export const LEAD_STATUS_OPTIONS: Lead["status"][] = ["Nuevo", "En Cotización", "Ganado", "Perdido"];

export const LEAD_STATUS_STYLES: Record<Lead["status"], { select: string; accent: string; dot: string }> = {
  Nuevo: { select: "border-amber-200 bg-amber-50 text-amber-700", accent: "border-amber-200", dot: "bg-amber-500" },
  "En Cotización": { select: "border-sky-200 bg-sky-50 text-sky-700", accent: "border-sky-200", dot: "bg-sky-500" },
  Ganado: { select: "border-green-200 bg-green-50 text-green-700", accent: "border-green-200", dot: "bg-green-500" },
  Perdido: { select: "border-red-200 bg-red-50 text-red-700", accent: "border-red-200", dot: "bg-red-500" },
};

export function getSlaBadge(createdAt: string, leadStatus: string, now: number | null) {
  if (leadStatus !== "Nuevo" || now === null) return null;
  const diffHours = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (diffHours < 2) {
    return (
      <Badge tone="success" className="gap-1">
        <CheckCircle2 size={11} />
        Respuesta Inmediata (&lt;2h)
      </Badge>
    );
  }
  if (diffHours < 24) {
    return (
      <Badge tone="warning" className="gap-1">
        <Clock size={11} />
        Atención Requerida Hoy
      </Badge>
    );
  }
  return (
    <Badge tone="danger" className="gap-1 animate-pulse">
      <AlertCircle size={11} />
      SLA Vencido (&gt;24h)
    </Badge>
  );
}

export function getFollowUpBadge(lead: Lead, todayIso: string) {
  if (!lead.next_follow_up_at) return null;
  const dueDate = lead.next_follow_up_at.slice(0, 10);
  if (dueDate < todayIso) {
    return (
      <Badge tone="danger" className="gap-1">
        <CalendarClock size={11} />
        Seguimiento vencido
      </Badge>
    );
  }
  if (dueDate === todayIso) {
    return (
      <Badge tone="warning" className="gap-1">
        <CalendarClock size={11} />
        Seguimiento hoy
      </Badge>
    );
  }
  return (
    <Badge tone="info" className="gap-1">
      <CalendarClock size={11} />
      {new Date(`${dueDate}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
    </Badge>
  );
}

/** Fecha (sin hora) de hoy en la zona local — mismo criterio en ambas vistas. */
export function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
