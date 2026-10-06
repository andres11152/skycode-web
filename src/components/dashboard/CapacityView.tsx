import { Users2, ClipboardList, LifeBuoy, Clock } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { TeamCapacity } from "./types";
import { StatCard } from "./ui/StatCard";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Comercial",
  traffiker: "Traffiker",
};

function loadBarColor(pct: number): string {
  if (pct > 100) return "bg-danger";
  if (pct > 80) return "bg-warning";
  return "bg-accent";
}

export function CapacityView({ capacity }: { capacity: TeamCapacity[] }) {
  const totalOpenTasks = capacity.reduce((sum, c) => sum + c.open_tasks_count, 0);
  const totalOpenTickets = capacity.reduce((sum, c) => sum + c.open_tickets_count, 0);
  const totalHoursThisWeek = capacity.reduce((sum, c) => sum + c.hours_this_week, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Capacidad del Equipo</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Tareas y tickets abiertos por persona, con horas registradas en la semana en curso
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tareas Abiertas (equipo)" value={totalOpenTasks} icon={<ClipboardList size={18} className="text-accent-strong" />} />
        <StatCard label="Tickets Abiertos (equipo)" value={totalOpenTickets} icon={<LifeBuoy size={18} className="text-accent-strong" />} />
        <StatCard label="Horas Registradas (esta semana)" value={<>{totalHoursThisWeek}h</>} icon={<Clock size={18} className="text-accent-strong" />} />
      </div>

      {capacity.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState icon={Users2} title="Sin equipo activo" description="No hay miembros de equipo activos para mostrar." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table data-keep-table data-sticky-first className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Carga de trabajo por persona: tareas, tickets y horas de la semana</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Persona</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Tareas Abiertas</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Horas Estimadas Pendientes</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Tickets Abiertos</th>
                  <th scope="col" className="px-5 py-3.5">Horas Esta Semana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {capacity.map((person) => {
                  const loadPct = Math.min(150, Math.round((person.hours_this_week / person.weekly_hours_capacity) * 100));
                  return (
                    <tr key={person.id}>
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground">{person.name}</div>
                        <div className="text-[11px] text-foreground/70 font-mono">
                          {ROLE_LABELS[person.role] ?? person.role}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-mono">{person.open_tasks_count}</td>
                      <td className="px-5 py-4 text-right font-mono text-foreground">
                        {person.open_estimated_hours > 0 ? `${person.open_estimated_hours}h` : "—"}
                      </td>
                      <td className="px-5 py-4 text-center font-mono">
                        {person.open_tickets_count > 0 ? (
                          <span className="text-warning font-bold">{person.open_tickets_count}</span>
                        ) : (
                          <span className="text-foreground/70">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-foreground/15 overflow-hidden">
                            <div
                              className={`h-full transition-all ${loadBarColor(loadPct)}`}
                              style={{ width: `${Math.min(100, loadPct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-foreground/70 shrink-0 w-16 text-right">
                            {person.hours_this_week}h / {person.weekly_hours_capacity}h
                          </span>
                        </div>
                      </td>
                    </tr>
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
