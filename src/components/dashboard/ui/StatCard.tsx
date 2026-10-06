import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "./Badge";

const VALUE_TONE: Record<BadgeTone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Tarjeta de KPI única. Había cinco copias a mano (Reportes, Caja, Capacidad,
 * SEO, Resumen) que ya se habían separado: `text-xl` vs `text-2xl`, con y sin
 * blur, icono con y sin chip.
 *
 * `tone` solo debe usarse cuando el número SIGNIFICA algo (vencido = `danger`,
 * cobrado = `success`): pintar una métrica neutra (tasa de conversión) de
 * ámbar la hace parecer una alerta. Cifras con `tabular-nums` para que no
 * bailen al cambiar de valor.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: BadgeTone;
  /** Si se pasa, toda la tarjeta es un enlace al módulo de origen. */
  href?: string;
  /** Alternativa a `href` para tarjetas que cambian de pestaña en la misma página. */
  onClick?: () => void;
  className?: string;
}) {
  const base = "block min-w-0 space-y-2 rounded-xl border border-foreground/10 bg-background p-5 shadow-sm shadow-black/5";
  const body = (
    <>
      <div className="flex items-center justify-between gap-3 text-xs text-foreground/70">
        <span>{label}</span>
        {icon && <span aria-hidden="true">{icon}</span>}
      </div>
      <div className={cn("truncate text-2xl font-bold font-mono tabular-nums tracking-tight", VALUE_TONE[tone])}>{value}</div>
      {hint && <div className="text-xs text-foreground/70">{hint}</div>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "outline-none transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0",
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          "w-full text-left outline-none transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0",
          className,
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}
