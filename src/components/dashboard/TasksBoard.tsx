"use client";

import { useId, useState } from "react";
import { Plus, X, Trash2, Clock, ClipboardList } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { Sprint, Task, TaskStatus } from "./types";

const STATUS_OPTIONS: TaskStatus[] = ["Pendiente", "En Progreso", "Completada"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pendiente: "bg-foreground/20 text-foreground/60",
  "En Progreso": "bg-sky-500/10 border border-sky-500/20 text-sky-700",
  Completada: "bg-green-500/10 border border-green-500/20 text-green-700",
};

interface TasksBoardProps {
  projectId: number;
  sprints: Sprint[];
  initialTasks: Task[];
  teamMembers: { id: number; name: string; email: string }[];
  canWrite: boolean;
  currentUserId: number | string;
}

const emptyForm = { title: "", description: "", sprintId: "", assigneeId: "", estimatedHours: "", dueDate: "" };

export function TasksBoard({ projectId, sprints, initialTasks, teamMembers, canWrite, currentUserId }: TasksBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const titleId = useId();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          sprint_id: form.sprintId ? Number(form.sprintId) : null,
          assignee_id: form.assigneeId ? Number(form.assigneeId) : null,
          estimated_hours: form.estimatedHours ? Number(form.estimatedHours) : null,
          due_date: form.dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la tarea.");
        return;
      }
      setTasks((prev) => [...prev, data.task]);
      setForm(emptyForm);
      setShowForm(false);
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

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
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch {
      // Silencioso a propósito: el select vuelve a su valor real en el
      // próximo render si el PATCH falló, sin bloquear la UI con un toast.
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: number) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section aria-labelledby="tasks-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="tasks-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Tareas
        </h2>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white hover:brightness-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancelar" : "Nueva tarea"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 space-y-3"
        >
          {error && <p className="text-xs text-red-700">{error}</p>}
          <div className="space-y-1.5">
            <label htmlFor={titleId} className="text-xs font-medium text-foreground/70">
              Título
            </label>
            <input
              id={titleId}
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              placeholder="Ej. Integrar pasarela de pagos"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Sprint (opcional)</label>
              <select
                value={form.sprintId}
                onChange={(e) => setForm((f) => ({ ...f, sprintId: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="" className="bg-background">Sin sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id} className="bg-background">{s.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Responsable (opcional)</label>
              <select
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="" className="bg-background">Sin asignar</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-background">{m.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Horas estimadas (opcional)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Fecha límite (opcional)</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-foreground/20 bg-foreground/10 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-accent-strong px-4 py-2 text-xs font-bold text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isSaving ? "Creando..." : "Crear tarea"}
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState
            icon={ClipboardList}
            title="Sin tareas"
            description="Este proyecto todavía no tiene tareas registradas."
            action={canWrite ? { label: "Nueva tarea", onClick: () => setShowForm(true) } : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tareas del proyecto, con responsable, estado y horas</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-4 py-3">Tarea</th>
                  <th scope="col" className="px-4 py-3">Responsable</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Horas (real/estimado)</th>
                  <th scope="col" className="px-4 py-3">Vence</th>
                  {canWrite && <th scope="col" className="px-4 py-3 sr-only">Eliminar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {tasks.map((task) => {
                  const canEditStatus = canWrite || task.assignee?.id === currentUserId;
                  const isOverEstimate = task.estimated_hours !== null && task.actual_hours > task.estimated_hours;
                  return (
                    <tr key={task.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.sprint_title && (
                          <div className="text-[10px] text-foreground/50 font-mono mt-0.5">{task.sprint_title}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{task.assignee?.name ?? "Sin asignar"}</td>
                      <td className="px-4 py-3">
                        {canEditStatus ? (
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
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[task.status]}`}>
                            {task.status}
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
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={updatingId === task.id}
                            aria-label={`Eliminar tarea ${task.title}`}
                            className="rounded-lg p-1.5 text-foreground/50 hover:bg-red-500/10 hover:text-red-700 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
