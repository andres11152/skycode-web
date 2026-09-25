"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { logError } from "@/lib/logger";
import type { OnboardingItem } from "./types";

// Etiqueta neutral en tercera persona a propósito ("Cliente"/"Equipo", no
// "Tú"): este mismo componente lo ve tanto el cliente en /portal como el
// equipo interno en /dashboard/proyectos/[id] — un "Tú" sería incorrecto
// para la mitad de esa audiencia.
const RESPONSIBLE_LABELS: Record<"client" | "team", string> = { client: "Cliente", team: "Equipo" };

/**
 * Checklist de arranque del proyecto (ver migración 0027) — solo aparece
 * si el proyecto tiene ítems (los creados antes de esta migración no
 * tienen ninguno, y no hay backfill retroactivo: fabricar un checklist
 * "completado a medias" para proyectos que ya llevan meses correspondería
 * a datos falsos, no reales). Visible de una vez al cargar (no colapsado
 * como `SprintComments`) — es información de arranque temprano, más
 * relevante que un hilo de comentarios que puede o no tener contenido.
 */
export function OnboardingChecklist({ projectId }: { projectId: number }) {
  const [items, setItems] = useState<OnboardingItem[] | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/onboarding`)
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch((err) => {
        logError("Error al cargar el checklist de onboarding", err);
        setItems([]);
      });
  }, [projectId]);

  if (items !== null && items.length === 0) return null;

  const completedCount = items?.filter((i) => i.completed).length ?? 0;

  const handleToggle = async (item: OnboardingItem) => {
    const nextCompleted = !item.completed;
    setTogglingId(item.id);
    setItems((prev) => (prev ? prev.map((i) => (i.id === item.id ? { ...i, completed: nextCompleted } : i)) : prev));
    try {
      const res = await fetch(`/api/projects/${projectId}/onboarding/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) {
        // Revierte el optimismo si el servidor no lo aceptó.
        setItems((prev) => (prev ? prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed } : i)) : prev));
      }
    } catch (err) {
      logError("Error al actualizar ítem de onboarding", err);
      setItems((prev) => (prev ? prev.map((i) => (i.id === item.id ? { ...i, completed: item.completed } : i)) : prev));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-foreground/60">
          <ClipboardCheck size={14} className="text-accent" />
          Checklist de Arranque
        </h2>
        {items && (
          <span className="font-mono text-[10px] text-foreground/50">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {items === null ? (
        <p className="text-[11px] text-foreground/40">Cargando…</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={togglingId === item.id}
                className="flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {item.completed ? (
                  <CheckCircle2 size={16} className="shrink-0 text-green-700" />
                ) : (
                  <Circle size={16} className="shrink-0 text-foreground/30" />
                )}
                <span className={`flex-1 text-xs ${item.completed ? "text-foreground/50 line-through" : "text-foreground"}`}>
                  {item.title}
                </span>
                <span className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-foreground/50">
                  {RESPONSIBLE_LABELS[item.responsible]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
