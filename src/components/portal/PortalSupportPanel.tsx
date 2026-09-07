"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { LifeBuoy, Plus } from "lucide-react";
import { EmptyState } from "../dashboard/EmptyState";
import { ModalShell } from "../dashboard/ModalShell";
import type { ProjectOption, SupportTicket, TicketPriority, TicketStatus } from "../dashboard/types";

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  Baja: "bg-background/20 text-background/60",
  Media: "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  Alta: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  Urgente: "bg-red-500/10 border border-red-500/20 text-red-400",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  Abierto: "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  "En Progreso": "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  Resuelto: "bg-green-500/10 border border-green-500/20 text-green-400",
  Cerrado: "bg-background/20 text-background/50",
};

/**
 * El cliente abre incidencias pero no elige prioridad ni responsable
 * (POST /api/support-tickets las fuerza a "Media" y sin asignar cuando
 * quien llama no tiene `support:write`) — eso lo decide el equipo al
 * triar el ticket, no quien lo reporta.
 */
export function PortalSupportPanel({ tickets, projects }: { tickets: SupportTicket[]; projects: ProjectOption[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section aria-labelledby="portal-support-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="portal-support-heading" className="text-lg font-bold text-background">Soporte</h2>
          <p className="mt-1 text-xs text-background/70">Reporta una incidencia sobre alguno de tus proyectos.</p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground shrink-0"
          >
            <Plus size={14} />
            <span>Abrir incidencia</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-background/15 bg-background/5 backdrop-blur-2xl shadow-2xl">
        {tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="Sin incidencias" description="No has reportado ninguna incidencia todavía." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-background/90">
              <caption className="sr-only">Tus incidencias de soporte, con estado y prioridad</caption>
              <thead className="border-b border-background/10 bg-background/10 font-mono uppercase text-[10px] text-background/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Título</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Prioridad</th>
                  <th scope="col" className="px-5 py-3.5">Estado</th>
                  <th scope="col" className="px-5 py-3.5">Abierto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background/10">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-4 font-medium text-background max-w-xs truncate">{t.title}</td>
                    <td className="px-5 py-4 text-background/70">{t.project_title}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-background/60 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && <CreateTicketModal projects={projects} onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}

function CreateTicketModal({ projects, onClose }: { projects: ProjectOption[]; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, title, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo abrir la incidencia.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al abrir la incidencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Abrir incidencia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-background/80">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-foreground text-background">{p.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-background/80">Título</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. El formulario de contacto no envía correos"
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-background/80">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Cuéntanos qué pasó, cuándo y qué esperabas que pasara."
            className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background placeholder:text-background/50 outline-none focus:border-accent resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          {isSubmitting ? "Enviando..." : "Abrir incidencia"}
        </button>
      </form>
    </ModalShell>
  );
}
