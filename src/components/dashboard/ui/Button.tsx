import { cn } from "@/lib/utils";

export type DashboardButtonVariant = "accent" | "secondary" | "ghost";

const VARIANT_STYLES: Record<DashboardButtonVariant, string> = {
  accent: "bg-accent-strong text-white font-bold shadow-md hover:brightness-90",
  secondary: "border border-foreground/15 bg-foreground/[0.02] text-foreground font-medium shadow-sm hover:bg-foreground/[0.06]",
  ghost: "text-foreground/70 font-medium hover:bg-foreground/5 hover:text-foreground",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DashboardButtonVariant;
};

/**
 * Botón del panel interno — versión ligera para UI densa de admin, sin las
 * animaciones de flecha/círculo de src/components/ui/Button.tsx (ese asume
 * contexto de marketing en el sitio público). Reemplaza los botones
 * "Actualizar"/"Nueva X" que cada board copiaba con el mismo className.
 */
export function Button({ variant = "secondary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
