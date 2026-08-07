"use client";

import { useMemo, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { Project, TimeEntry } from "./types";

export function TimeEntriesView({
  initialEntries,
  projects,
}: {
  initialEntries: TimeEntry[];
  projects: Pick<Project, "id" | "title" | "sprints">[];
}) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [sprintId, setSprintId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const totalHours = useMemo(() => entries.reduce((sum, e) => sum + e.hours, 0), [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          sprint_id: sprintId ? Number(sprintId) : undefined,
          entry_date: entryDate,
          hours: Number(hours),
          description: description || undefined,
          billable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar la hora.");
        return;
      }
      setEntries(data.entries);
      setHours("");
      setDescription("");
    } catch {
      setError("Ocurrió un error de red al registrar las horas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/time-entries?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-background">Mis Horas</h1>
          <p className="mt-1 text-xs text-background/70 font-sans">Registro de tiempo por proyecto.</p>
        </div>
        <div className="rounded-xl border border-background/15 bg-background/5">
          <EmptyState icon={Clock} title="Sin proyectos activos" description="No hay proyectos contra los cuales registrar horas todavía." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-background">Mis Horas</h1>
          <p className="mt-1 text-xs text-background/70 font-sans">
            {totalHours.toFixed(1)}h registradas en total.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-background/15 bg-background/5 p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end"
      >
        {error && (
          <div className="sm:col-span-2 lg:col-span-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="space-y-1.5 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-background/70">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(Number(e.target.value));
              setSprintId("");
            }}
            className="w-full rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-foreground text-background">{p.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-background/70">Sprint (opcional)</label>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-full rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent cursor-pointer"
          >
            <option value="" className="bg-foreground text-background">—</option>
            {selectedProject?.sprints.map((s) => (
              <option key={s.id} value={s.id} className="bg-foreground text-background">{s.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-background/70">Fecha</label>
          <input
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background outline-none focus:border-accent font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-background/70">Horas</label>
          <input
            type="number"
            required
            min="0.25"
            max="24"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="4"
            className="w-full rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] font-semibold text-background/70 h-[2.125rem]">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-background/30 accent-accent"
            />
            Facturable
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-6 flex gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del trabajo (opcional)"
            className="flex-1 min-w-0 rounded-lg border border-background/15 bg-background/10 py-2 px-3 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground shrink-0"
          >
            <Plus size={14} />
            <span>Registrar</span>
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {entries.length === 0 ? (
          <EmptyState icon={Clock} title="Sin horas registradas" description="Registra tu primera entrada arriba." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-background/90">
              <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                <tr>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Proyecto / Sprint</th>
                  <th className="px-5 py-3.5">Descripción</th>
                  <th className="px-5 py-3.5">Horas</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background/10">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 font-mono text-[11px] text-background/70">
                      {new Date(entry.entry_date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-background">{entry.project_title}</div>
                      {entry.sprint_title && (
                        <div className="text-[10px] text-background/50">{entry.sprint_title}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate text-background/70">{entry.description || "—"}</td>
                    <td className="px-5 py-3 font-mono font-bold text-background">
                      {entry.hours}h
                      {!entry.billable && (
                        <span className="ml-1.5 text-[9px] font-normal text-background/40 uppercase">No fact.</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Eliminar registro"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
