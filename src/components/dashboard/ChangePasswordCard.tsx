"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

const MIN_LENGTH = 12;

/**
 * Cambiar la contraseña estando logueado (`POST /api/account/password`).
 * Antes de esto el único camino era cerrar sesión y pedirse un correo de
 * recuperación.
 *
 * La confirmación ("repetir contraseña") se valida solo acá, en el
 * cliente: es una ayuda contra errores de tipeo, no una regla de
 * seguridad — el servidor no necesita recibirla.
 */
export function ChangePasswordCard() {
  const router = useRouter();
  const id = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && next.length >= MIN_LENGTH && confirm === next && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la contraseña.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess("Contraseña actualizada. Cerramos tus sesiones en otros dispositivos por seguridad.");
      // La lista de sesiones de la misma página quedó desactualizada.
      router.refresh();
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const inputType = showPasswords ? "text" : "password";

  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground/70">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Contraseña</h3>
            <p className="mt-0.5 text-xs text-foreground/70">
              Al cambiarla se cierran tus sesiones en otros dispositivos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPasswords((v) => !v)}
          aria-pressed={showPasswords}
          aria-label={showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Campo de usuario oculto: los gestores de contraseñas (1Password,
            Chrome) lo necesitan para asociar la contraseña nueva a la cuenta
            correcta en vez de ofrecer guardarla "sin usuario". */}
        <input type="text" name="username" autoComplete="username" className="sr-only" tabIndex={-1} aria-hidden="true" readOnly value="" />
        <Field
          id={`${id}-current`}
          label="Contraseña actual"
          type={inputType}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id={`${id}-new`}
            label="Contraseña nueva"
            type={inputType}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            aria-invalid={tooShort || undefined}
            hint={tooShort ? `Faltan ${MIN_LENGTH - next.length} caracteres (mínimo ${MIN_LENGTH}).` : `Mínimo ${MIN_LENGTH} caracteres.`}
            required
          />
          <Field
            id={`${id}-confirm`}
            label="Repetir contraseña nueva"
            type={inputType}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={mismatch ? "No coincide con la contraseña nueva." : undefined}
            required
          />
        </div>
        <div className="flex justify-end border-t border-foreground/10 pt-4">
          <Button type="submit" variant="secondary" disabled={!canSubmit}>
            {saving ? "Actualizando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </div>
  );
}
