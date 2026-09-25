"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Code2, Layers, ShieldCheck, Calendar, AlertCircle, ClipboardList } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { SprintApproval } from "./SprintApproval";
import { SprintComments } from "./SprintComments";
import { ProjectTimeline } from "./ProjectTimeline";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import type { Project } from "./types";

interface ProjectsBoardProps {
  initialProjects: Project[];
  /**
   * "internal" (default): vista de equipo — muestra a qué cliente
   * pertenece cada proyecto. "portal": vista del propio cliente en
   * `/portal` — mismo componente, mismo renderizado de sprints/SLA, pero
   * sin la línea "Cliente: ..." (sería mostrarle su propio nombre de
   * vuelta) y con copy en segunda persona.
   */
  variant?: "internal" | "portal";
}

export function ProjectsBoard({ initialProjects, variant = "internal" }: ProjectsBoardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  // Ver LeadsTable.tsx: ajusta el estado durante el render en vez de un
  // useEffect+setState, para no disparar un render en cascada.
  const [prevInitialProjects, setPrevInitialProjects] = useState(initialProjects);
  if (initialProjects !== prevInitialProjects) {
    setPrevInitialProjects(initialProjects);
    setProjects(initialProjects);
  }

  const handleRefresh = () => startRefresh(() => router.refresh());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {variant === "portal" ? "Tus Proyectos" : "Portal de Proyectos & Avances"}
          </h1>
          <p className="mt-1 text-xs text-foreground/70 font-sans">
            {variant === "portal"
              ? "Sigue el avance, los sprints entregables y los links de despliegue de tu proyecto en tiempo real."
              : "Monitoree el avance, sprints entregables y links de despliegue en tiempo real."}
          </p>
        </div>
        <Button variant="accent" onClick={handleRefresh} disabled={isRefreshing} className="self-start sm:self-auto">
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Actualizar Avances</span>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <EmptyState
            icon={AlertCircle}
            title={variant === "portal" ? "Sin proyectos todavía" : "Ningún proyecto registrado"}
            description={
              variant === "portal"
                ? "No encontramos proyectos asociados a tu cuenta por ahora."
                : "Todavía no hay proyectos creados en el sistema."
            }
          />
        </div>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-6 space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-foreground/10 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
                    <Badge
                      tone={
                        project.status === "En Desarrollo"
                          ? "info"
                          : project.status === "Fase QA"
                          ? "warning"
                          : project.status === "Garantía SLA"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-xs text-foreground/70 mt-1">{project.description}</p>
                  )}
                  {variant === "internal" && (
                    <p className="text-[10px] text-foreground/40 font-mono mt-1">
                      Cliente: {project.client.name} ({project.client.email})
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {variant === "internal" && (
                    <Link
                      href={`/dashboard/proyectos/${project.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/10 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <ClipboardList size={14} />
                      <span>Ver tareas</span>
                    </Link>
                  )}
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
                  <span className="font-mono text-accent font-bold">{project.progress}%</span>
                </div>
                <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-sky-400 transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {variant === "portal" && project.sprints && project.sprints.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-foreground/10">
                  <h3 className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-wider">
                    Línea de Tiempo
                  </h3>
                  <ProjectTimeline sprints={project.sprints} />
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-foreground/10">
                <h3 className="text-xs font-mono font-bold text-foreground/60 uppercase tracking-wider">
                  Sprints de Desarrollo &amp; Entregables
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  {project.sprints && project.sprints.map((sprint) => (
                    <div
                      key={sprint.id}
                      className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 flex flex-col justify-between gap-3 hover:border-foreground/25 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-foreground leading-tight">{sprint.title}</span>
                        <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                          sprint.status === "Completado"
                            ? "bg-green-500/10 text-green-700"
                            : sprint.status === "En Progreso"
                            ? "bg-sky-500/10 text-sky-700"
                            : "bg-foreground/20 text-foreground/50"
                        }`}>
                          {sprint.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-foreground/50">
                          <span>Avance</span>
                          <span>{sprint.progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              sprint.status === "Completado" ? "bg-green-400" : "bg-sky-400"
                            }`}
                            style={{ width: `${sprint.progress}%` }}
                          />
                        </div>
                      </div>

                      {variant === "portal" && sprint.status === "Completado" && (
                        <SprintApproval sprint={sprint} />
                      )}

                      <SprintComments sprintId={sprint.id} />
                    </div>
                  ))}
                </div>
              </div>

              {project.status === "Garantía SLA" && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={20} className="text-green-700 shrink-0" />
                    <div>
                      <strong className="text-green-700 block font-semibold">Garantía Post-Entrega de 90 Días SLA Activa</strong>
                      <span className="text-[11px] text-foreground/60">Cero bugs cubierto a nivel de infraestructura y código.</span>
                    </div>
                  </div>
                  {project.sla_warranty_start && project.sla_warranty_end && (
                    <div className="flex items-center gap-1.5 text-green-700/90 font-mono text-[10px] shrink-0 border border-green-500/20 rounded-lg p-2 bg-green-500/5">
                      <Calendar size={12} />
                      <span>Vence: {new Date(project.sla_warranty_end).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
