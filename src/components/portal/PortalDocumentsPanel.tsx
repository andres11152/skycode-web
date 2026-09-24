"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { DownloadSimple, FileText, UploadSimple } from "@phosphor-icons/react";
import { EmptyState } from "../dashboard/EmptyState";
import { ModalShell } from "../dashboard/ModalShell";
import { Button } from "../dashboard/ui/Button";
import { Alert } from "../dashboard/ui/Alert";
import type { ProjectDocument, ProjectOption } from "../dashboard/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Descarga + subida (esta última es la pieza de "Portal ampliado" que
 * faltaba: antes el cliente solo podía descargar lo que el equipo subía,
 * nunca mandar lo suyo — brief, logos, accesos). Borrar sigue siendo
 * exclusivo del equipo interno (/dashboard/proyectos/[id]) — no es parte
 * de este alcance, mismo criterio que Soporte (el cliente abre, no
 * gestiona el ciclo completo). Reutiliza `POST /api/documents` (ahora
 * acepta también `role === "client"` sobre un proyecto propio, ver esa
 * ruta) y la misma ruta de descarga que el panel interno.
 */
export function PortalDocumentsPanel({ documents, projects }: { documents: ProjectDocument[]; projects: ProjectOption[] }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <section aria-labelledby="portal-documents-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="portal-documents-heading" className="text-lg font-bold text-foreground">Documentos</h2>
          <p className="mt-1 text-xs text-foreground/70">Contratos, especificaciones, entregables — y lo que necesites mandarnos.</p>
        </div>
        {projects.length > 0 && (
          <Button variant="accent" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <UploadSimple size={14} /> Subir documento
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="Sin documentos todavía" description="Sube el primero, o espera a que el equipo suba uno a tu proyecto." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Documentos de tus proyectos, descargables</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Archivo</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Subido por</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Tamaño</th>
                  <th scope="col" className="px-5 py-3.5">Fecha</th>
                  <th scope="col" className="px-5 py-3.5 sr-only">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <FileText size={13} className="text-foreground/40 shrink-0" />
                        <span className="truncate max-w-xs">{doc.original_filename}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground/70">{doc.project_title}</td>
                    <td className="px-5 py-4 text-foreground/70">{doc.uploaded_by?.name ?? "—"}</td>
                    <td className="px-5 py-4 text-right font-mono text-foreground/60">{formatBytes(doc.size_bytes)}</td>
                    <td className="px-5 py-4 font-mono text-foreground/60 whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        aria-label={`Descargar ${doc.original_filename}`}
                        className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-foreground/60 hover:bg-accent/10 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <DownloadSimple size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {uploadOpen && <UploadDocumentModal projects={projects} onClose={() => setUploadOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.txt,.csv";

function UploadDocumentModal({ projects, onClose }: { projects: ProjectOption[]; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
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
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al subir el documento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell titleId={titleId} title="Subir documento" onClose={onClose}>
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
          <label className="block text-xs font-semibold text-foreground/80">Archivo</label>
          <input
            ref={fileInputRef}
            type="file"
            required
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="w-full rounded-xl border border-foreground/15 bg-foreground/10 py-2.5 px-4 text-xs text-foreground outline-none focus:border-accent file:mr-3 file:rounded-lg file:border-0 file:bg-accent-strong file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white file:cursor-pointer cursor-pointer"
          />
          <p className="text-[10px] text-foreground/50">PDF, Office, imagen, ZIP, TXT o CSV — máximo 20 MB.</p>
        </div>
        <Button type="submit" variant="accent" disabled={isSubmitting || !fileName} className="w-full py-3">
          {isSubmitting ? "Subiendo..." : "Subir documento"}
        </Button>
      </form>
    </ModalShell>
  );
}
