import { Skeleton } from "@/components/dashboard/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-foreground/15 bg-foreground/5 p-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-2 w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
