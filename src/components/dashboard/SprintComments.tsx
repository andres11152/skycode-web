"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { logError } from "@/lib/logger";
import type { SprintComment } from "./types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Equipo",
  sales_manager: "Equipo",
  traffiker: "Equipo",
  client: "Cliente",
};

/**
 * Hilo de comentarios de un sprint — visible para el cliente dueño del
 * proyecto y para el equipo interno por igual (ver migración 0026), a
 * diferencia de `SprintApproval` que es exclusivo del cliente. Colapsado
 * por defecto: la tarjeta de sprint ya es densa (progreso, estado,
 * aprobación), cargar y mostrar comentarios de una vez por cada sprint de
 * cada proyecto sería una consulta y un bloque visual que la mayoría de
 * las veces nadie necesita ver.
 */
export function SprintComments({ sprintId }: { sprintId: number }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<SprintComment[] | null>(null);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/sprints/${sprintId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments ?? []))
      .catch((err) => {
        logError("Error al cargar comentarios del sprint", err);
        setComments([]);
      });
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) load();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el comentario.");
        return;
      }
      setComments((prev) => [...(prev ?? []), data.comment]);
      setBody("");
    } catch {
      setError("Ocurrió un error de red al enviar el comentario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-foreground/10 pt-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 text-[11px] font-semibold text-foreground/60 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
      >
        <MessageSquare size={12} />
        {comments === null ? "Comentarios" : `Comentarios (${comments.length})`}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {comments === null ? (
            <p className="text-[10px] text-foreground/40">Cargando…</p>
          ) : comments.length === 0 ? (
            <p className="text-[10px] text-foreground/40">Sin comentarios todavía.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground">{c.author?.name ?? "Cuenta eliminada"}</span>
                    {c.author && (
                      <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-foreground/50">
                        {ROLE_LABELS[c.author.role] ?? c.author.role}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">{c.body}</p>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-[10px] text-red-700">{error}</p>}

          <form onSubmit={handleSubmit} className="flex items-start gap-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un comentario…"
              rows={1}
              maxLength={2000}
              className="flex-1 min-w-0 resize-none rounded-lg border border-foreground/15 bg-background px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-foreground/40 outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              aria-label="Enviar comentario"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-strong text-white hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
