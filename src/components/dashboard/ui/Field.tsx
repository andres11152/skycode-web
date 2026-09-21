import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/40 outline-none focus:border-accent font-mono";

/**
 * Reemplaza el className de <input> repetido 7 veces en SettingsForm.tsx
 * (y el mismo patrón copiado en otros formularios del dashboard). El label
 * siempre va asociado por htmlFor/id — nunca placeholder-only.
 */
export function Field({
  id,
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground/80">
        {label}
      </label>
      <input id={id} className={cn(INPUT_CLASS, className)} {...props} />
      {hint && <p className="text-[10px] text-foreground/50">{hint}</p>}
    </div>
  );
}

export function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] text-foreground/60">{description}</p>
      </div>
      {children}
    </div>
  );
}
