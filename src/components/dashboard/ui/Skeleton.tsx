import { cn } from "@/lib/utils";

/** Bloque base — un rectángulo `animate-pulse` sobre el mismo token de superficie que las cards del panel. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-foreground/10", className)} />;
}

/** Fila de tabla: una franja por columna, para loading.tsx de vistas tabulares (Facturación, Auditoría...). */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-foreground/10 px-5 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}

/** Card: para grids de tarjetas (Campañas, Soporte...). */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/** Vista completa: encabezado + N filas, patrón repetido en cada loading.tsx de ruta tabular. */
export function SkeletonTableView({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/** Vista de grid de tarjetas: encabezado + N cards, patrón repetido en cada loading.tsx de ruta tipo board. */
export function SkeletonCardGridView({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
