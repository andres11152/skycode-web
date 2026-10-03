"use client";

import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import type { PowStatus } from "@/lib/usePowChallenge";

/**
 * Campo señuelo (honeypot): invisible y fuera del orden de tabulación para
 * una persona, pero un bot que rellena todos los campos del formulario lo
 * llena y el servidor lo trata como un intento automatizado (ver
 * lib/authShield.ts). Los atributos `data-*-ignore` evitan que los
 * gestores de contraseñas lo rellenen por error.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden opacity-0">
      <label>
        Sitio web
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
        />
      </label>
    </div>
  );
}

/**
 * Estado del proof-of-work, anunciado a lectores de pantalla. Es información,
 * no un paso que la persona deba hacer: el botón de enviar nunca se
 * deshabilita por esto (`submit` espera a que termine el reto).
 */
export function SecurityCheckStatus({ status }: { status: PowStatus }) {
  const text =
    status === "ready"
      ? "Conexión verificada"
      : status === "error"
        ? "No pudimos completar la verificación de seguridad. Recarga la página."
        : "Verificando seguridad…";

  return (
    <p role="status" aria-live="polite" className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-background/70">
      {status === "error" ? (
        <WarningCircle size={13} aria-hidden="true" className="shrink-0 text-red-400" />
      ) : (
        <ShieldCheck size={13} aria-hidden="true" className={status === "ready" ? "shrink-0 text-emerald-400" : "shrink-0 motion-safe:animate-pulse"} />
      )}
      <span>{text}</span>
    </p>
  );
}
