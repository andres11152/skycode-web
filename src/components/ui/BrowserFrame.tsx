import { cn } from "@/lib/utils";

/**
 * Marco de navegador decorativo para capturas reales de proyectos. La barra
 * superior es puramente ornamental (`aria-hidden`): el nombre accesible de la
 * captura lo da el `alt` de la imagen, no el host que se muestra.
 *
 * `onDark` invierte la paleta para usarlo sobre una banda `bg-foreground`
 * (ver "Secciones oscuras" en CLAUDE.md): bordes y texto en `background/NN`.
 */
export function BrowserFrame({
  children,
  url,
  onDark = false,
  className,
}: {
  children: React.ReactNode;
  url?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-xl border-b",
        onDark ? "border-background/15 bg-background/[0.06]" : "border-foreground/10 bg-foreground/[0.04]",
        className,
      )}
    >
      <div aria-hidden="true" className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={cn("h-2 w-2 rounded-full", onDark ? "bg-background/25" : "bg-foreground/20")}
            />
          ))}
        </div>
        {url && (
          <span
            className={cn(
              "max-w-[200px] truncate rounded px-2 py-0.5 font-mono text-[10px] sm:max-w-xs",
              onDark ? "bg-background/10 text-background/70" : "bg-foreground/5 text-foreground/60",
            )}
          >
            {url}
          </span>
        )}
        <div className="w-6" />
      </div>
      {children}
    </div>
  );
}
