import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/Button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-20 text-center space-y-2">
      <Icon size={32} className="text-foreground/30 mx-auto" />
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="text-xs text-foreground/60">{description}</p>
      {action && (
        <div className="pt-4">
          <Button variant="accent" onClick={action.onClick} className="mx-auto">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
