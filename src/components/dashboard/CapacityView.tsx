import { Users2, ClipboardList, LifeBuoy, Clock } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { TeamCapacity } from "./types";

// Supuesto de jornada estándar para la barra de "horas esta semana" — no
// hay un campo de horas contractuales por persona en el esquema todavía.
// Si eso se necesita (ej. alguien de medio tiempo), acá es donde habría
// que leerlo en vez de asumir un número fijo para todos.
const WEEKLY_CAPACITY_HOURS = 40;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Comercial",
  traffiker: "Traffiker",
};

function loadBarColor(pct: number): string {
  if (pct > 100) return "bg-red-400";
  if (pct > 80) return "bg-amber-400";
  return "bg-accent";
}

export function CapacityView({ capacity }: { capacity: TeamCapacity[] }) {
  const totalOpenTasks = capacity.reduce((sum, c) => sum + c.open_tasks_count, 0);
  const totalOpenTickets = capacity.reduce((sum, c) => sum + c.open_tickets_count, 0);
  const totalHoursThisWeek = capacity.reduce((sum, c) => sum + c.hours_this_week, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-background">Capacidad del Equipo</h1>
        <p className="mt-1 text-xs text-background/70 font-sans">
          Tareas y tickets abiertos por persona, con horas registradas en la semana en curso
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-background/60">
            <span>Tareas Abiertas (equipo)</span>
            <ClipboardList size={18} className="text-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-background">{totalOpenTasks}</div>
        </div>
        <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-background/60">
            <span>Tickets Abiertos (equipo)</span>
            <LifeBuoy size={18} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{totalOpenTickets}</div>
        </div>
        <div className="rounded-xl border border-background/15 bg-background/5 p-5 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-background/60">
            <span>Horas Registradas (esta semana)</span>
            <Clock size={18} className="text-green-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-400">{totalHoursThisWeek}h</div>
        </div>
      </div>

      {capacity.length === 0 ? (
        <div className="rounded-xl border border-background/15 bg-background/5">
          <EmptyState icon={Users2} title="Sin equipo activo" description="No hay miembros de equipo activos para mostrar." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-background/90">
              <caption className="sr-only">Carga de trabajo por persona: tareas, tickets y horas de la semana</caption>
              <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Persona</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Tareas Abiertas</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Horas Estimadas Pendientes</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Tickets Abiertos</th>
                  <th scope="col" className="px-5 py-3.5">Horas Esta Semana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background/10">
                {capacity.map((person) => {
                  const loadPct = Math.min(150, Math.round((person.hours_this_week / WEEKLY_CAPACITY_HOURS) * 100));
                  return (
                    <tr key={person.id}>
                      <td className="px-5 py-4">
                        <div className="font-bold text-background">{person.name}</div>
                        <div className="text-[10px] text-background/50 font-mono">
                          {ROLE_LABELS[person.role] ?? person.role}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-mono">{person.open_tasks_count}</td>
                      <td className="px-5 py-4 text-right font-mono text-background">
                        {person.open_estimated_hours > 0 ? `${person.open_estimated_hours}h` : "—"}
                      </td>
                      <td className="px-5 py-4 text-center font-mono">
                        {person.open_tickets_count > 0 ? (
                          <span className="text-amber-400 font-bold">{person.open_tickets_count}</span>
                        ) : (
                          <span className="text-background/40">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-background/15 overflow-hidden">
                            <div
                              className={`h-full transition-all ${loadBarColor(loadPct)}`}
                              style={{ width: `${Math.min(100, loadPct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-background/60 shrink-0 w-16 text-right">
                            {person.hours_this_week}h / {WEEKLY_CAPACITY_HOURS}h
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
