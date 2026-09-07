import Link from "next/link";
import { ArrowLeft, Code2, Layers, ShieldCheck, Calendar } from "lucide-react";
import { TasksBoard } from "./TasksBoard";
import { DocumentsPanel } from "./DocumentsPanel";
import type { Project, ProjectDocument, Task } from "./types";

const PROJECT_STYLES: Record<string, string> = {
  "En Desarrollo": "bg-sky-500/10 border border-sky-500/20 text-sky-400",
  "Fase QA": "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  "Garantía SLA": "bg-green-500/10 border border-green-500/20 text-green-400",
};

export function ProjectDetailView({
  project,
  tasks,
  teamMembers,
  canReadTasks,
  canWriteTasks,
  documents,
  canReadDocuments,
  canWriteDocuments,
  currentUserId,
}: {
  project: Project;
  tasks: Task[];
  teamMembers: { id: number; name: string; email: string }[];
  canReadTasks: boolean;
  canWriteTasks: boolean;
  documents: ProjectDocument[];
  canReadDocuments: boolean;
  canWriteDocuments: boolean;
  currentUserId: number | string;
}) {
  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/proyectos"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-background/70 hover:text-background transition-colors outline-none rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
      >
        <ArrowLeft size={14} />
        Volver a proyectos
      </Link>

      <div className="rounded-xl border border-background/15 bg-background/5 p-6 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-background/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-background">{project.title}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  PROJECT_STYLES[project.status] ?? "bg-background/20 text-background/60"
                }`}
              >
                {project.status}
              </span>
            </div>
            {project.description && <p className="text-xs text-background/70 mt-1">{project.description}</p>}
            <p className="text-[10px] text-background/40 font-mono mt-1">
              Cliente: {project.client.name} ({project.client.email})
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-background/15 bg-background/10 px-3 py-1.5 text-xs text-background hover:bg-background/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              >
                <Code2 size={14} />
                <span>Repositorio</span>
              </a>
            )}
            {project.staging_url && (
              <a
                href={project.staging_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              >
                <Layers size={14} />
                <span>Entorno Staging</span>
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Progreso General del Software:</span>
            <span className="font-mono text-accent font-bold">{project.progress}%</span>
          </div>
          <div className="h-2 w-full bg-background/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-sky-400 transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {project.sprints.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-background/10">
            <h2 className="text-xs font-mono font-bold text-background/60 uppercase tracking-wider">
              Sprints de Desarrollo &amp; Entregables
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="rounded-xl border border-background/10 bg-background/5 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-background leading-tight">{sprint.title}</span>
                    <span
                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                        sprint.status === "Completado"
                          ? "bg-green-500/10 text-green-400"
                          : sprint.status === "En Progreso"
                          ? "bg-sky-500/10 text-sky-400"
                          : "bg-background/20 text-background/50"
                      }`}
                    >
                      {sprint.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-background/50">
                      <span>Avance</span>
                      <span>{sprint.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-background/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${sprint.status === "Completado" ? "bg-green-400" : "bg-sky-400"}`}
                        style={{ width: `${sprint.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {project.status === "Garantía SLA" && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-green-400 shrink-0" />
              <div>
                <strong className="text-green-400 block font-semibold">Garantía Post-Entrega de 90 Días SLA Activa</strong>
                <span className="text-[11px] text-background/60">Cero bugs cubierto a nivel de infraestructura y código.</span>
              </div>
            </div>
            {project.sla_warranty_start && project.sla_warranty_end && (
              <div className="flex items-center gap-1.5 text-green-400/90 font-mono text-[10px] shrink-0 border border-green-500/20 rounded-lg p-2 bg-green-500/5">
                <Calendar size={12} />
                <span>Vence: {new Date(project.sla_warranty_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {canReadTasks && (
        <TasksBoard
          projectId={project.id}
          sprints={project.sprints}
          initialTasks={tasks}
          teamMembers={teamMembers}
          canWrite={canWriteTasks}
          currentUserId={currentUserId}
        />
      )}

      {canReadDocuments && (
        <DocumentsPanel projectId={project.id} initialDocuments={documents} canWrite={canWriteDocuments} />
      )}
    </div>
  );
}
