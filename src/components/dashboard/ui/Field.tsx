import { cn } from "@/lib/utils";
import { FieldError } from "@/components/ui/FieldError";

const INPUT_CLASS =
  "w-full rounded-xl border border-foreground/15 bg-foreground/[0.02] py-2.5 px-4 text-xs text-foreground placeholder:text-foreground/60 outline-none focus:border-accent font-mono disabled:cursor-not-allowed disabled:opacity-60";

// `/60` y no `/50`: a 10px, texto normal en `/50` sobre blanco queda por
// debajo de 4.5:1 (ver la regla de contraste para texto pequeño en CLAUDE.md).
const HINT_CLASS = "text-[11px] text-foreground/70";

/**
 * Enlaza hint y error al control por `aria-describedby`, y marca
 * `aria-invalid` solo si hay error — así el lector de pantalla lee la causa
 * al enfocar el campo, igual que el formulario de contacto del sitio público.
 */
function describedBy(id: string, hasHint: boolean, error?: string) {
  const ids = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return {
    "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
    "aria-invalid": error ? (true as const) : undefined,
  };
}

const INVALID_CLASS = "border-danger/60 focus:border-danger";

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
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel id={id} label={label} />
      <input id={id} className={cn(INPUT_CLASS, error && INVALID_CLASS, className)} {...describedBy(id, Boolean(hint), error)} {...props} />
      {hint && (
        <p id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

/** Mismo contrato que `Field` para un `<select>` nativo (accesible con teclado sin librería). */
export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel id={id} label={label} />
      <select
        id={id}
        className={cn(INPUT_CLASS, "cursor-pointer", error && INVALID_CLASS, className)}
        {...describedBy(id, Boolean(hint), error)}
        {...props}
      >
        {children}
      </select>
      {hint && (
        <p id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
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
  error,
  maxLength,
  value,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
}) {
  const counter = maxLength ? `${value.length}/${maxLength}` : null;
  return (
    <div className="space-y-1.5">
      <FieldLabel id={id} label={label} />
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        className={cn(INPUT_CLASS, "min-h-24 resize-y font-sans leading-relaxed", error && INVALID_CLASS, className)}
        {...describedBy(id, Boolean(hint || counter), error)}
        {...props}
      />
      {(hint || counter) && (
        <p id={`${id}-hint`} className={cn(HINT_CLASS, "flex justify-between gap-3")}>
          <span>{hint}</span>
          {counter && <span className="font-mono tabular-nums">{counter}</span>}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
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
        <p className="mt-0.5 text-[11px] text-foreground/70">{description}</p>
      </div>
      {children}
    </div>
  );
}
