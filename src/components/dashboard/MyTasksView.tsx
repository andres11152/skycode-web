"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ClipboardCheck, AlertTriangle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Badge } from "./ui/Badge";
import type { MyTask, TaskStatus } from "./types";

const STATUS_OPTIONS: TaskStatus[] = ["Pendiente", "En Progreso", "Completada"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pendiente: "bg-foreground/10 text-foreground/60",
  "En Progreso": "bg-sky-500/10 border border-sky-500/20 text-sky-700",
  Completada: "bg-green-500/10 border border-green-500/20 text-green-700",
};

function isOverdue(task: MyTask): boolean {
  if (!task.due_date || task.status === "Completada") return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

/**
 * "Mis Tareas": todo lo asignado al usuario actual, cruzando todos los
 * proyectos (ver GET /api/tasks/mine) — sin formulario de creación ni
 * borrado, eso sigue viviendo en el tablero de cada proyecto
 * (`TasksBoard.tsx`). Acá solo se puede cambiar el propio `status`, mismo
 * endpoint de autogestión (`PATCH /api/tasks/[id]` con solo `status`) que
 * ya usa `TasksBoard` — nunca una segunda vía de escritura.
 */
export function MyTasksView({ initialTasks }: { initialTasks: MyTask[] }) {
  const [tasks, setTasks] = useState<MyTask[]>(initialTasks);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)));
      }
    } catch {
      // Silencioso a propósito: el select vuelve a su valor real en el
      // próximo render si el PATCH falló, mismo criterio que TasksBoard.
    } finally {
      setUpdatingId(null);
    }
  };

  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Tareas</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Todo lo que tienes asignado, en todos tus proyectos, en un solo lugar.
        </p>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-medium text-red-700">
          <AlertTriangle size={14} />
          Tienes {overdueCount} {overdueCount === 1 ? "tarea vencida" : "tareas vencidas"}.
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState icon={ClipboardCheck} title="Sin tareas asignadas" description="No tienes ninguna tarea asignada por ahora." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tareas asignadas a mí, con proyecto, estado y horas</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-4 py-3">Tarea</th>
                  <th scope="col" className="px-4 py-3">Proyecto</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Horas (real/estimado)</th>
                  <th scope="col" className="px-4 py-3">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  const isOverEstimate = task.estimated_hours !== null && task.actual_hours > task.estimated_hours;
                  return (
                    <tr key={task.id} className={overdue ? "bg-red-500/[0.03]" : undefined}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.sprint_title && (
                          <div className="text-[10px] text-foreground/50 font-mono mt-0.5">{task.sprint_title}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/proyectos/${task.project_id}`}
                          className="text-accent hover:underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                        >
                          {task.project_title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={task.status}
                          disabled={updatingId === task.id}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`rounded-full px-2 py-1 text-[10px] font-bold outline-none disabled:opacity-50 ${STATUS_STYLES[task.status]}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                          ))}
                        </select>
                        {overdue && (
                          <span className="ml-2">
                            <Badge tone="danger">Vencida</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={isOverEstimate ? "text-amber-700 font-bold" : "text-foreground"}>
                          {task.actual_hours}h
                        </span>
                        {task.estimated_hours !== null && (
                          <span className="text-foreground/50"> / {task.estimated_hours}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/60 font-mono whitespace-nowrap">
                        {task.due_date ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(task.due_date).toLocaleDateString("es-CO")}
                          </span>
                        ) : (
                          "—"
                        )}
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
