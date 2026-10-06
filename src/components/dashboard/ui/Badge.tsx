import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Centraliza el mapa de color que antes se copiaba por separado en
 * CampaignsBoard/InvoicesBoard/SupportTicketsBoard/ExpensesBoard/ProjectsBoard.
 * Usa los tokens de estado de theme.css (success/warning/danger/info), con
 * contraste >5:1 sobre su propio tinte. 11px y no 10px: es texto normal de
 * lectura rápida en tablas densas, no metadata decorativa.
 */
const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-foreground/5 border border-foreground/10 text-foreground/70",
  info: "bg-info/10 border border-info/25 text-info",
  success: "bg-success/10 border border-success/25 text-success",
  warning: "bg-warning/10 border border-warning/25 text-warning",
  danger: "bg-danger/10 border border-danger/25 text-danger",
};

/** Clases de color de un tono, para controles que deben verse como su badge (ej. el `<select>` de estado de una tarea). */
export function badgeToneClass(tone: BadgeTone): string {
  return TONE_STYLES[tone];
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
