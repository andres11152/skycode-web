import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="py-20 text-center space-y-2">
      <Icon size={32} className="text-background/30 mx-auto" />
      <h3 className="text-sm font-bold text-background">{title}</h3>
      <p className="text-xs text-background/60">{description}</p>
    </div>
  );
}
