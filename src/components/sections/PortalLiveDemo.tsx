"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT, SPRING_SOFT } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { getHeroContent } from "@/content/hero";

type PortalCopy = ReturnType<typeof getHeroContent>["portalMockup"];
type SprintState = "done" | "active" | "todo";

/** Retardo (ms) de la animación CSS `assemble` (el portal "se arma" al cargar). */
const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;

/** Momentos de la demostración, en ms desde que el portal entra en pantalla (tras armarse). */
const STEPS = [1500, 2400, 3200] as const;

const CHIP: Record<SprintState, string> = {
  done: "bg-foreground text-background",
  active: "border border-foreground/30 text-foreground",
  todo: "border border-foreground/10 text-foreground/70",
};

/**
 * Parte viva del portal de ejemplo del Hero: cuenta, sin texto, cómo trabaja el cliente con nosotros.
 * Una sola vez al entrar en pantalla: la barra de "Panel de reportes" se llena (resorte, `scaleX`),
 * su estado cambia a "Aprobado", arranca el siguiente entregable y llega un comentario nuevo del
 * equipo con su punto de aviso. No hay bucle infinito.
 *
 * El HTML del servidor trae el estado inicial completo (sin JS se ve el portal quieto). Con reduced
 * motion no corre la secuencia. Solo `transform`/`opacity`. Está fuera del LCP (el H1 y el párrafo
 * del Hero no se animan, lo exige `motionRules.test.ts`).
 */
export function PortalLiveDemo({ copy }: { copy: PortalCopy }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        STEPS.forEach((at, index) => {
          timers.push(window.setTimeout(() => setStep(index + 1), at));
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [reduced]);

  const [first, second, third] = copy.sprints;
  const sprints = [
    { name: first.name, status: first.status, state: first.state as SprintState, progress: first.progress },
    {
      name: second.name,
      status: step >= 2 ? first.status : second.status,
      state: (step >= 2 ? "done" : second.state) as SprintState,
      progress: step >= 1 ? 100 : second.progress,
    },
    {
      name: third.name,
      status: step >= 2 ? second.status : third.status,
      state: (step >= 2 ? "active" : third.state) as SprintState,
      progress: step >= 2 ? 15 : third.progress,
    },
  ];
  const commentText = step >= 3 ? copy.commentNext : copy.comment.text;

  return (
    <div ref={ref} className="flex flex-col gap-5 max-sm:gap-4">
      <div>
        <p style={delay(150)} className="assemble font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-foreground/70">
          {copy.deliverablesLabel}
        </p>
        <ul className="mt-3 flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10">
          {sprints.map((sprint, index) => (
            <li key={sprint.name} style={delay(210 + index * 85)} className="assemble flex flex-col gap-2.5 p-3.5 max-sm:p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <span className="font-mono text-xs text-foreground/60">{String(index + 1).padStart(2, "0")}</span>
                  {sprint.name}
                </span>
                {/* El estado cambia con un deslizamiento vertical (sale hacia arriba, entra desde abajo). */}
                <span className="relative inline-flex overflow-hidden rounded-full">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={sprint.status}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: DURATION.base, ease: EASE_OUT }}
                      className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", CHIP[sprint.state])}
                    >
                      {sprint.status}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <span className="h-1 overflow-hidden rounded-full bg-foreground/10">
                {/* Dos capas: la exterior "se arma" al cargar (CSS); la interior lleva el avance (Motion). */}
                <span style={delay(360 + index * 85)} className="assemble-fill block h-full">
                  <motion.span
                    initial={false}
                    animate={{ scaleX: sprint.progress / 100 }}
                    transition={SPRING_SOFT}
                    style={{ originX: 0 }}
                    className="block h-full w-full rounded-full bg-foreground"
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* En móvil se omite: el portal entra entero en el primer pantallazo en vez de cortarse a mitad del comentario. */}
      <div style={delay(520)} className="assemble flex items-start gap-3 rounded-xl bg-foreground/[0.04] p-3.5 max-sm:hidden">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-xs font-bold text-background">
          S
          {/* Aviso de mensaje nuevo: aparece con un resorte cuando llega el comentario. */}
          <AnimatePresence>
            {step >= 3 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={SPRING_SOFT}
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-background"
              />
            )}
          </AnimatePresence>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{copy.comment.label}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={commentText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="mt-0.5 text-sm leading-relaxed text-foreground/80"
            >
              {commentText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
