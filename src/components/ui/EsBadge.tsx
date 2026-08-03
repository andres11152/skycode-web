import { cn } from "@/lib/utils";

export function EsBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded border border-foreground/15 px-1 text-[10px] font-semibold text-foreground/60",
        className,
      )}
    >
      ES
    </span>
  );
}
