import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/40 outline-none focus:border-accent font-mono disabled:cursor-not-allowed disabled:opacity-60";

// `/60` y no `/50`: a 10px, texto normal en `/50` sobre blanco queda por
// debajo de 4.5:1 (ver la regla de contraste para texto pequeño en CLAUDE.md).
const HINT_CLASS = "text-[10px] text-foreground/60";

function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-foreground/80">
      {label}
    </label>
  );
}

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
      <FieldLabel id={id} label={label} />
      <input id={id} className={cn(INPUT_CLASS, className)} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Mismo contrato que `Field` para un `<select>` nativo (accesible con teclado sin librería). */
export function SelectField({
  id,
  label,
  hint,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel id={id} label={label} />
      <select
        id={id}
        className={cn(INPUT_CLASS, "cursor-pointer", className)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      >
        {children}
      </select>
      {hint && (
        <p id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * `<textarea>` con contador opcional de caracteres. El contador se anuncia
 * por `aria-describedby`, así un lector de pantalla sabe cuánto queda sin
 * tener que adivinar dónde está el límite.
 */
export function TextAreaField({
  id,
  label,
  hint,
  maxLength,
  value,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; value: string }) {
  const counter = maxLength ? `${value.length}/${maxLength}` : null;
  return (
    <div className="space-y-1.5">
      <FieldLabel id={id} label={label} />
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        className={cn(INPUT_CLASS, "min-h-24 resize-y font-sans leading-relaxed", className)}
        aria-describedby={hint || counter ? `${id}-hint` : undefined}
        {...props}
      />
      {(hint || counter) && (
        <p id={`${id}-hint`} className={cn(HINT_CLASS, "flex justify-between gap-3")}>
          <span>{hint}</span>
          {counter && <span className="font-mono tabular-nums">{counter}</span>}
        </p>
      )}
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
