"use client";

import { useState } from "react";
import {  Download, Trash2, FileText } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Alert } from "./ui/Alert";
import type { ProjectDocument } from "./types";
import { formatShortDate } from "@/lib/utils";
import { useFeedback } from "./ui/Feedback";
import { FileDropzone } from "./ui/FileDropzone";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({
  projectId,
  initialDocuments,
  canWrite,
}: {
  projectId: number;
  initialDocuments: ProjectDocument[];
  canWrite: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleFile = async (file: File) => {

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("project_id", String(projectId));
      formData.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo subir el documento.");
        return;
      }
      setDocuments((prev) => [data.document, ...prev]);
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const feedback = useFeedback();
  const handleDelete = async (id: number) => {
    const name = documents.find((d) => d.id === id)?.original_filename ?? "este documento";
    const ok = await feedback.confirm({
      title: `¿Eliminar «${name}»?`,
      description: "El archivo deja de estar disponible para el equipo y para el cliente.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        feedback.toast({ message: "Documento eliminado." });
      } else {
        feedback.toast({ tone: "error", message: "No se pudo eliminar el documento." });
      }
    } catch {
      feedback.toast({ tone: "error", message: "No se pudo eliminar el documento. Revisa tu conexión." });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-labelledby="documents-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="documents-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/70">
          Documentos
        </h2>
      </div>

      {canWrite && (
        <FileDropzone
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.txt,.csv"
          maxBytes={20 * 1024 * 1024}
          label="Arrastra un documento o haz clic para elegirlo"
          hint="PDF, Office, imágenes, ZIP, TXT o CSV"
          busy={isUploading}
          onFile={handleFile}
          onReject={setError}
        />
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState icon={FileText} title="Sin documentos" description="Este proyecto todavía no tiene documentos subidos." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Documentos subidos a este proyecto, con tamaño y quién los subió</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                <tr>
                  <th scope="col" className="px-4 py-3">Archivo</th>
                  <th scope="col" className="px-4 py-3">Subido por</th>
                  <th scope="col" className="px-4 py-3 text-right">Tamaño</th>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="relative px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <FileText size={13} className="text-foreground/70 shrink-0" />
                        <span className="truncate max-w-xs">{doc.original_filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{doc.uploaded_by?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground/70">{formatBytes(doc.size_bytes)}</td>
                    <td className="px-4 py-3 font-mono text-foreground/70 whitespace-nowrap">
                      {formatShortDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          aria-label={`Descargar ${doc.original_filename}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 hover:bg-accent/10 hover:text-accent-strong transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Download size={13} />
                        </a>
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            aria-label={`Eliminar ${doc.original_filename}`}
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
