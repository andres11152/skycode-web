"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Lifebuoy, Plus } from "@phosphor-icons/react";
import { EmptyState } from "../dashboard/EmptyState";
import { ModalShell } from "../dashboard/ModalShell";
import { Badge, type BadgeTone } from "../dashboard/ui/Badge";
import { Button } from "../dashboard/ui/Button";
import { Alert } from "../dashboard/ui/Alert";
import type { ProjectOption, SupportTicket, TicketPriority, TicketStatus } from "../dashboard/types";

const PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  Baja: "neutral",
  Media: "info",
  Alta: "warning",
  Urgente: "danger",
};

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  Abierto: "info",
  "En Progreso": "warning",
  Resuelto: "success",
  Cerrado: "neutral",
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
          <h2 id="portal-support-heading" className="text-lg font-bold text-foreground">Soporte</h2>
          <p className="mt-1 text-xs text-foreground/70">Reporta una incidencia sobre alguno de tus proyectos.</p>
        </div>
        {projects.length > 0 && (
          <Button variant="accent" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus size={14} />
            <span>Abrir incidencia</span>
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {tickets.length === 0 ? (
          <EmptyState
            icon={Lifebuoy}
            title="Sin incidencias"
            description="No has reportado ninguna incidencia todavía."
            action={projects.length > 0 ? { label: "Abrir incidencia", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tus incidencias de soporte, con estado y prioridad</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Título</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Prioridad</th>
                  <th scope="col" className="px-5 py-3.5">Estado</th>
                  <th scope="col" className="px-5 py-3.5">Abierto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-4 font-medium text-foreground max-w-xs truncate">{t.title}</td>
                    <td className="px-5 py-4 text-foreground/70">{t.project_title}</td>
                    <td className="px-5 py-4">
                      <Badge tone={PRIORITY_TONES[t.priority]}>{t.priority}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[t.status]}>{t.status}</Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60 whitespace-nowrap">
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
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-background text-foreground">{p.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Título</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. El formulario de contacto no envía correos"
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Cuéntanos qué pasó, cuándo y qué esperabas que pasara."
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/50 outline-none focus:border-accent resize-none"
          />
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
          {isSubmitting ? "Enviando..." : "Abrir incidencia"}
        </Button>
      </form>
    </ModalShell>
  );
}
