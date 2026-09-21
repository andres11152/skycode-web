"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert } from "./ui/Alert";
import type { Sprint } from "./types";

/**
 * Controles de aprobación de un entregable (sprint completado), exclusivo
 * del portal del cliente — ver PATCH /api/sprints/[id]/approval. Vive
 * separado de ProjectsBoard.tsx porque necesita su propio estado de
 * formulario (comentario, envío) por sprint, algo que el board padre no
 * gestiona para el resto de la tarjeta.
 */
export function SprintApproval({ sprint }: { sprint: Sprint }) {
  const router = useRouter();
  const [showComment, setShowComment] = useState<"aprobado" | "rechazado" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (sprint.approval_status) {
    return (
      <div
        className={`rounded-lg border px-3 py-2 text-[10px] ${
          sprint.approval_status === "aprobado"
            ? "border-green-500/20 bg-green-500/5 text-green-700"
            : "border-red-500/20 bg-red-500/5 text-red-700"
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold">
          {sprint.approval_status === "aprobado" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          <span>{sprint.approval_status === "aprobado" ? "Aprobado" : "Rechazado"}</span>
        </div>
        {sprint.approval_comment && <p className="mt-1 text-foreground/60">{sprint.approval_comment}</p>}
      </div>
    );
  }

  const submit = async (status: "aprobado" | "rechazado") => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar la aprobación.");
        return;
      }
      router.refresh();
    } catch {
      setError("Ocurrió un error de red.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showComment) {
    return (
      <div className="space-y-2">
        {error && <Alert tone="error" className="text-[10px]">{error}</Alert>}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentario (opcional)"
          rows={2}
          className="w-full rounded-lg border border-foreground/15 bg-foreground/10 px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-foreground/40 outline-none focus:border-accent resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => submit(showComment)}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              showComment === "aprobado" ? "bg-green-600 hover:brightness-90" : "bg-red-600 hover:brightness-90"
            }`}
          >
            {isSubmitting ? "Enviando..." : `Confirmar ${showComment === "aprobado" ? "aprobación" : "rechazo"}`}
          </button>
          <button
            onClick={() => setShowComment(null)}
            className="rounded-lg border border-foreground/15 px-2.5 py-1.5 text-[11px] text-foreground/70 hover:bg-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowComment("aprobado")}
        className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-[11px] font-bold text-green-700 hover:bg-green-500/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <CheckCircle2 size={12} />
        <span>Aprobar</span>
      </button>
      <button
        onClick={() => setShowComment("rechazado")}
        className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-500/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <XCircle size={12} />
        <span>Rechazar</span>
      </button>
    </div>
  );
}
