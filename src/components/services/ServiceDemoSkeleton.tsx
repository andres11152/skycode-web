import { Skeleton } from "@/components/ui/Skeleton";

/** Marco de ventana con líneas de código en skeleton, para el `loading` de la demo diferida de un servicio (h-72, como la demo real). */
export function ServiceDemoSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-72 flex-col gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-2 w-2 rounded-full" />
        ))}
        <Skeleton className="ml-3 h-3 w-24 rounded" />
      </div>
      <div className="flex flex-col gap-3 pt-2">
        {["w-2/5", "w-4/5", "w-3/5", "w-[72%]", "w-1/2", "w-2/3"].map((width, i) => (
          <Skeleton key={i} className={`h-3 rounded ${width}`} />
        ))}
      </div>
    </div>
  );
}
