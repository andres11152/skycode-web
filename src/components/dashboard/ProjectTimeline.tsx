import { CheckCircle2, XCircle, Circle, Clock } from "lucide-react";
import type { Sprint } from "./types";

/**
 * Franja "de un vistazo" del avance del proyecto para el portal del
 * cliente — un stepper horizontal (scroll en mobile, no un layout vertical
 * separado: mismo criterio de simplicidad que las tablas del dashboard,
 * que resuelven el ancho angosto con `overflow-x-auto` en vez de duplicar
 * el layout). No reemplaza la grilla de tarjetas de sprint que ya existe
 * en `ProjectsBoard.tsx` (con su `SprintApproval` interactivo) — es un
 * resumen visual ENCIMA de esa grilla, misma fuente de datos
 * (`project.sprints`, ya viene ordenado `ORDER BY id ASC` desde
 * `lib/queries/projects.ts`), cero queries nuevas.
 */
export function ProjectTimeline({ sprints }: { sprints: Sprint[] }) {
  if (sprints.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Línea de tiempo del proyecto"
      className="flex items-start overflow-x-auto pb-1"
    >
      {sprints.map((sprint, index) => {
        const isLast = index === sprints.length - 1;
        const isDone = sprint.status === "Completado";
        const isCurrent = sprint.status === "En Progreso";

        return (
          <div key={sprint.id} className="flex items-start first:pl-0 last:pr-0">
            <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  isDone
                    ? "border-green-500 bg-green-500/10 text-green-700"
                    : isCurrent
                    ? "border-accent bg-accent/10 text-accent animate-pulse"
                    : "border-foreground/20 bg-background text-foreground/30"
                }`}
              >
                {isDone ? <CheckCircle2 size={16} /> : isCurrent ? <Clock size={14} /> : <Circle size={12} />}
              </div>
              <span className={`line-clamp-2 text-[10px] font-semibold leading-tight ${isDone || isCurrent ? "text-foreground" : "text-foreground/50"}`}>
                {sprint.title}
              </span>
              {sprint.approval_status && (
                <span
                  className={`flex items-center gap-0.5 text-[9px] font-bold ${
                    sprint.approval_status === "aprobado" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {sprint.approval_status === "aprobado" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                  {sprint.approval_status === "aprobado" ? "Aprobado" : "Rechazado"}
                </span>
              )}
            </div>

            {!isLast && (
              <div
                className={`mt-4 h-0.5 w-10 shrink-0 sm:w-16 ${isDone ? "bg-green-500" : "bg-foreground/15"}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
