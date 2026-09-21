import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Centraliza el mapa de color que antes se copiaba por separado en
 * CampaignsBoard/InvoicesBoard/SupportTicketsBoard/ExpensesBoard/ProjectsBoard.
 * Calibrado para el dashboard en modo claro (bg-{color}-50/border-{color}-200/
 * text-{color}-700 da >7:1 de contraste sobre blanco — el patrón anterior con
 * -400 sobre fondo oscuro no pasaba contraste al voltear a fondo claro).
 */
const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-foreground/5 border border-foreground/10 text-foreground/60",
  info: "bg-sky-50 border border-sky-200 text-sky-700",
  success: "bg-green-50 border border-green-200 text-green-700",
  warning: "bg-amber-50 border border-amber-200 text-amber-700",
  danger: "bg-red-50 border border-red-200 text-red-700",
};

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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
