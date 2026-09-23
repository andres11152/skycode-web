import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

type ButtonBaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  showFlowArrows?: boolean;
};

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<NonNullable<ButtonBaseProps["variant"]>, string> = {
  accent:
    "bg-accent-strong border-[1.5px] border-accent/40 text-accent-foreground hover:border-transparent hover:text-white",
  primary:
    "bg-foreground border-[1.5px] border-foreground/40 text-background hover:border-transparent hover:text-white",
  secondary:
    "bg-transparent border-[1.5px] border-foreground/20 text-foreground hover:border-transparent hover:text-white",
  ghost:
    "bg-transparent border-[1.5px] border-transparent text-foreground hover:text-white",
};

const circleStyles: Record<NonNullable<ButtonBaseProps["variant"]>, string> = {
  accent: "bg-[#0a0a0a]",
  primary: "bg-accent",
  secondary: "bg-[#0a0a0a]",
  ghost: "bg-accent",
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
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "group relative inline-flex items-center justify-center gap-1 overflow-hidden rounded-[100px] font-semibold text-center cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:rounded-[12px] active:scale-[0.95]",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-50 disabled:pointer-events-none",
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  const content = (
    <>
      {showFlowArrows && (
        <ArrowRight
          aria-hidden="true"
          className="absolute w-4 h-4 left-[-25%] stroke-current fill-none z-[9] group-hover:left-4 group-hover:stroke-current transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        />
      )}

      <span
        className={cn(
          "relative z-[10] inline-flex items-center justify-center gap-2 transition-all duration-[800ms] ease-out",
          showFlowArrows ? "-translate-x-3 group-hover:translate-x-3" : ""
        )}
      >
        {children}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-[50%] opacity-0 group-hover:w-[450px] group-hover:h-[450px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] pointer-events-none z-0",
          circleStyles[variant]
        )}
      />

      {showFlowArrows && (
        <ArrowRight
          aria-hidden="true"
          className="absolute w-4 h-4 right-4 stroke-current fill-none z-[9] group-hover:right-[-25%] group-hover:stroke-current transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        />
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
