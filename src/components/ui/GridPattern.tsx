import { useId, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

// `numSquares`/`maxOpacity`/`duration`/`repeatDelay` venían del
// `AnimatedGridPattern` original de Magic UI, que dibujaba cuadros
// apareciendo al azar. Esta versión ya no los anima (se simplificó al sacar
// framer-motion del critical path, ver commit 2610226) — pero las props
// seguían declaradas acá y sin destructurar, así que `{...props}` las
// filtraba al `<svg>` del DOM. Eso rompía la hidratación: el servidor
// serializaba `numSquares="40"` (string) y el cliente lo reponía como
// `numSquares={40}` (número), y React abortaba con el error #418 en
// producción. No las vuelvas a declarar si no se usan de verdad.
export interface GridPatternProps extends ComponentPropsWithoutRef<"svg"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number;
}

export function GridPattern({
  width = 48,
  height = 48,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  className,
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-accent/40 stroke-foreground/[0.07]",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}
