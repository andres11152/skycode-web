import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

type ButtonBaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  showFlowArrows?: boolean;
  /**
   * Solo para `<button>`: muestra un spinner en el lugar de la flecha,
   * deshabilita el botón y anuncia `aria-busy`. El spinner ocupa el mismo
   * hueco de 16px que la flecha, así el botón no cambia de ancho al enviar.
   */
  loading?: boolean;
};

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    prefetch?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

// Reescrito a propósito para simplificar el hover (auditoría visual): la
// versión anterior mutaba el radio de píldora a 12px, expandía un círculo
// de 450px de diámetro y animaba dos flechas cruzándose, todo en 600-800ms
// — mucho movimiento para un botón que aparece decenas de veces por
// página. Ahora: el radio siempre es `rounded-full` (regla del sistema de
// diseño), el fondo/borde cambia de tono y una sola flecha se desliza unos
// px — mismo lenguaje que Stripe/Linear, ~150-200ms.
const variantStyles: Record<NonNullable<ButtonBaseProps["variant"]>, string> = {
  // accent-strong (no accent) como color de reposo + hover:brightness-90:
  // `accent` (#0089cd) con texto blanco da ~3.8:1, por debajo de AA para
  // texto normal — ver CLAUDE.md.
  accent: "bg-accent-strong text-accent-foreground hover:brightness-90",
  primary: "bg-foreground text-background hover:bg-foreground/85",
  secondary:
    "bg-transparent border border-foreground/20 text-foreground hover:border-foreground/35 hover:bg-foreground/5",
  ghost: "bg-transparent text-foreground hover:bg-foreground/5",
};

const sizeStyles: Record<NonNullable<ButtonBaseProps["size"]>, string> = {
  sm: "py-2 px-6 text-sm min-h-[2.5rem]",
  md: "py-2.5 px-7 text-sm min-h-[2.75rem]",
  lg: "py-3.5 px-9 text-base min-h-[3.25rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  showFlowArrows = true,
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold text-center cursor-pointer transition-[background-color,border-color,filter,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-50 disabled:pointer-events-none",
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  const content = (
    <>
      <span>{children}</span>
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      ) : showFlowArrows && (
        <ArrowRight
          aria-hidden="true"
          weight="bold"
          className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1"
        />
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, prefetch, ...anchorProps } = props;
    // Un ancla de la misma página (`#cotizador`) no necesita el router: con
    // <Link>, Next hacía prefetch de la página actual por cada una apenas
    // entraba en pantalla (3 descargas RSC de la home durante la carga).
    if (href.startsWith("#")) {
      return (
        <a href={href} className={classes} {...anchorProps}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={prefetch} className={classes} {...anchorProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={classes}
      {...buttonProps}
      disabled={buttonProps.disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
