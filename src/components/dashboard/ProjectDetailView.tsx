import {  Code2, Layers, ShieldCheck, Calendar } from "lucide-react";
import { TasksBoard } from "./TasksBoard";
import { DocumentsPanel } from "./DocumentsPanel";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { Badge } from "./ui/Badge";
import type { Project, ProjectDocument, Task } from "./types";
import { formatCalendarDate } from "@/lib/utils";
import { PROJECT_STATUS, SPRINT_STATUS } from "./statusMeta";
import { PageBack } from "./ui/PageHeader";

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
      <PageBack href="/dashboard/proyectos" label="Volver a proyectos" />

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-foreground/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <Badge tone={PROJECT_STATUS[project.status].tone}>{project.status}</Badge>
            </div>
            {project.description && <p className="text-xs text-foreground/70 mt-1">{project.description}</p>}
            <p className="text-[11px] text-foreground/70 font-mono mt-1">
              Cliente: {project.client.name} ({project.client.email})
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/10 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            <span className="font-mono text-accent-strong font-bold">{project.progress}%</span>
          </div>
          <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {project.sprints.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-foreground/10">
            <h2 className="text-xs font-mono font-bold text-foreground/70 uppercase tracking-wider">
              Sprints de Desarrollo &amp; Entregables
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground leading-tight">{sprint.title}</span>
                    <Badge tone={SPRINT_STATUS[sprint.status].tone}>{SPRINT_STATUS[sprint.status].label}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-foreground/70">
                      <span>Avance</span>
                      <span>{sprint.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${sprint.status === "Completado" ? "bg-success" : "bg-info"}`}
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
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-success shrink-0" />
              <div>
                <strong className="text-success block font-semibold">Garantía Post-Entrega de 90 Días SLA Activa</strong>
                <span className="text-[11px] text-foreground/70">Cero bugs cubierto a nivel de infraestructura y código.</span>
              </div>
            </div>
            {project.sla_warranty_start && project.sla_warranty_end && (
              <div className="flex items-center gap-1.5 text-success/90 font-mono text-[11px] shrink-0 border border-success/20 rounded-lg p-2 bg-success/5">
                <Calendar size={12} />
                <span>Vence: {formatCalendarDate(project.sla_warranty_end)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <OnboardingChecklist projectId={project.id} />

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
