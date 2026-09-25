"use client";

import { useState } from "react";
import { History } from "lucide-react";
import type { ClientActivity } from "./types";

/**
 * Bitácora comercial de un cliente — mismo patrón ya probado en el
 * timeline de interacción de `LeadsTable.tsx` (`lead_activities`), pero
 * como componente propio (no inline) porque acá vive en su propia sección
 * de la ficha, no dentro de un panel deslizante compartido con otros
 * formularios. `clients.notes` (el campo plano editable) sigue existiendo
 * aparte — esto es un historial aditivo, no un reemplazo.
 */
export function ClientActivityLog({
  clientId,
  initialActivities,
  canWrite,
}: {
  clientId: number;
  initialActivities: ClientActivity[];
  canWrite: boolean;
}) {
  const [activities, setActivities] = useState<ClientActivity[]>(initialActivities);
  const [body, setBody] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!body.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar la nota.");
        return;
      }
      setActivities((prev) => [data.activity, ...prev]);
      setBody("");
    } catch {
      setError("Ocurrió un error de red. Intenta de nuevo.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section aria-labelledby="client-activity-heading" className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
      <h2 id="client-activity-heading" className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-foreground/60">
        <History size={15} className="text-accent" />
        Bitácora comercial
      </h2>

      {canWrite && (
        <div className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Registrar una llamada, reunión o nota de seguimiento..."
            className="flex-1 min-w-0 rounded-lg border border-foreground/15 bg-foreground/10 px-3 py-2 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !body.trim()}
            className="rounded-lg bg-accent/20 border border-accent/30 px-3 py-2 text-[11px] font-bold text-accent hover:bg-accent/30 transition-all disabled:opacity-50 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Agregar
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-red-700">{error}</p>}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-[11px] text-foreground/50 text-center py-4">Sin notas de seguimiento todavía.</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-foreground/50">
                  {new Date(activity.created_at).toLocaleString("es-CO")}
                </span>
              </div>
              <p className="text-foreground/90 whitespace-pre-wrap">{activity.body}</p>
              {activity.actor_name && <p className="text-[10px] text-foreground/40 mt-1">— {activity.actor_name}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
