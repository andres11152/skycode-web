import { Download, FileText } from "lucide-react";
import { EmptyState } from "../dashboard/EmptyState";
import type { ProjectDocument } from "../dashboard/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Solo descarga — el cliente no sube ni borra documentos desde el
 * portal, eso sigue siendo exclusivo del equipo interno
 * (/dashboard/proyectos/[id]). Reutiliza la misma ruta de descarga que el
 * panel interno (GET /api/documents/[id]/download), que ya valida por
 * dueño para sesiones `role === "client"` — ver esa ruta.
 */
export function PortalDocumentsPanel({ documents }: { documents: ProjectDocument[] }) {
  return (
    <section aria-labelledby="portal-documents-heading" className="space-y-4">
      <div>
        <h2 id="portal-documents-heading" className="text-lg font-bold text-foreground">Documentos</h2>
        <p className="mt-1 text-xs text-foreground/70">Contratos, especificaciones y entregables de tus proyectos.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="Sin documentos todavía" description="Cuando el equipo suba un documento a tu proyecto, aparecerá acá." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Documentos de tus proyectos, descargables</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Archivo</th>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
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
                        <Download size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
