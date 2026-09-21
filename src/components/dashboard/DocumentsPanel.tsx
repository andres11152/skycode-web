"use client";

import { useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { ProjectDocument } from "./types";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-labelledby="documents-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="documents-heading" className="text-sm font-bold uppercase tracking-wide text-foreground/60">
          Documentos
        </h2>
        {canWrite && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              className="sr-only"
              id={`upload-${projectId}`}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.txt,.csv"
            />
            <label
              htmlFor={`upload-${projectId}`}
              className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white hover:brightness-90 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background has-disabled:opacity-50 has-disabled:pointer-events-none"
            >
              <Upload size={13} />
              {isUploading ? "Subiendo..." : "Subir documento"}
            </label>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState icon={FileText} title="Sin documentos" description="Este proyecto todavía no tiene documentos subidos." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Documentos subidos a este proyecto, con tamaño y quién los subió</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-4 py-3">Archivo</th>
                  <th scope="col" className="px-4 py-3">Subido por</th>
                  <th scope="col" className="px-4 py-3 text-right">Tamaño</th>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="px-4 py-3 sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <FileText size={13} className="text-foreground/40 shrink-0" />
                        <span className="truncate max-w-xs">{doc.original_filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{doc.uploaded_by?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground/60">{formatBytes(doc.size_bytes)}</td>
                    <td className="px-4 py-3 font-mono text-foreground/60 whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          aria-label={`Descargar ${doc.original_filename}`}
                          className="rounded-lg p-1.5 text-foreground/60 hover:bg-accent/10 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Download size={13} />
                        </a>
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            aria-label={`Eliminar ${doc.original_filename}`}
                            className="rounded-lg p-1.5 text-foreground/50 hover:bg-red-500/10 hover:text-red-700 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
