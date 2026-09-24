"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle, Copy, Key, ShieldAlert, ShieldCheck } from "lucide-react";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";

type Step = "idle" | "setting-up" | "confirming" | "backup-codes" | "disabling" | "regenerating";

interface SetupData {
  secret: string;
  qrCodeDataUrl: string;
}

/**
 * Autenticación en dos pasos (TOTP, ver lib/totp.ts) — autogestión pura
 * desde /dashboard/cuenta, sin permiso RBAC (cualquier sesión configura su
 * propio segundo factor, mismo criterio que revocar sesiones propias).
 * Máquina de estados simple en vez de un formulario multi-paso con
 * routing: todo el flujo (activar → escanear → confirmar → ver códigos de
 * respaldo) vive en esta misma tarjeta sin navegar a ningún lado.
 */
export function TwoFactorSetup({ initialEnabled, initialRemainingBackupCodes }: { initialEnabled: boolean; initialRemainingBackupCodes: number }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [remainingBackupCodes, setRemainingBackupCodes] = useState(initialRemainingBackupCodes);
  const [step, setStep] = useState<Step>("idle");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetToIdle = () => {
    setStep("idle");
    setSetupData(null);
    setCode("");
    setBackupCodes(null);
    setError(null);
  };

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar la configuración.");
      setSetupData({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
      setStep("setting-up");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto.");

      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setRemainingBackupCodes(data.backupCodes.length);
      setStep("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto.");

      setEnabled(false);
      setRemainingBackupCodes(0);
      resetToIdle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto.");

      setBackupCodes(data.backupCodes);
      setRemainingBackupCodes(data.backupCodes.length);
      setStep("backup-codes");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-foreground/5 text-foreground/50"}`}>
            {enabled ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Autenticación en dos pasos</h3>
            <p className="mt-0.5 text-xs text-foreground/60">
              {enabled
                ? `Activada — te quedan ${remainingBackupCodes} código${remainingBackupCodes === 1 ? "" : "s"} de respaldo.`
                : "Agrega una capa extra de seguridad con Google Authenticator, Authy o similar."}
            </p>
          </div>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Estado: 2FA apagado, sin flujo activo */}
      {!enabled && step === "idle" && (
        <Button variant="accent" onClick={handleStartSetup} disabled={loading}>
          {loading ? "Preparando…" : "Activar 2FA"}
        </Button>
      )}

      {/* Estado: 2FA prendido, sin flujo activo */}
      {enabled && step === "idle" && (
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setStep("regenerating")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-foreground/15 bg-foreground/[0.02] px-3.5 py-2 text-xs font-medium text-foreground hover:bg-foreground/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Key size={13} /> Regenerar códigos de respaldo
          </button>
          <button
            type="button"
            onClick={() => setStep("disabling")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-500/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Desactivar 2FA
          </button>
        </div>
      )}

      {/* Paso 1: escanear QR + confirmar código */}
      {step === "setting-up" && setupData && (
        <form onSubmit={handleConfirm} className="space-y-3">
          <p className="text-xs text-foreground/70">
            Escanea este código con tu app de autenticación (Google Authenticator, Authy, 1Password…):
          </p>
          <div className="flex justify-center rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
            <Image src={setupData.qrCodeDataUrl} alt="Código QR para configurar 2FA" width={180} height={180} unoptimized className="rounded-lg" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
            <code className="flex-1 truncate text-[11px] font-mono text-foreground/80">{setupData.secret}</code>
            <button
              type="button"
              onClick={copySecret}
              aria-label="Copiar código secreto"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground/50 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {copied ? <CheckCircle size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-foreground/50">¿No puedes escanear? Escribe el código de arriba a mano en tu app.</p>

          <div className="space-y-1.5">
            <label htmlFor="confirm-code" className="block text-xs font-semibold text-foreground/80">
              Código de tu app para confirmar
            </label>
            <input
              id="confirm-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-foreground/15 bg-background py-2.5 px-4 text-center text-lg tracking-[0.3em] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background font-mono"
            />
          </div>

          <div className="flex gap-2.5">
            <Button type="submit" variant="accent" disabled={loading || code.trim().length === 0}>
              {loading ? "Confirmando…" : "Confirmar y activar"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetToIdle}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Códigos de respaldo — se muestran UNA sola vez, en texto plano */}
      {step === "backup-codes" && backupCodes && (
        <div className="space-y-3">
          <Alert tone="success">
            <div className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0" />
              <span>2FA activado. Guarda estos códigos de respaldo en un lugar seguro — cada uno funciona una sola vez y no se van a volver a mostrar.</span>
            </div>
          </Alert>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 font-mono text-xs">
            {backupCodes.map((c) => (
              <div key={c} className="rounded-lg bg-background px-2.5 py-1.5 text-center text-foreground">
                {c}
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={resetToIdle}>
            Ya los guardé
          </Button>
        </div>
      )}

      {/* Desactivar — exige un código válido */}
      {step === "disabling" && (
        <form onSubmit={handleDisable} className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>Escribe un código actual de tu app (o uno de respaldo) para confirmar que quieres desactivar 2FA.</span>
          </div>
          <input
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos o de respaldo"
            className="w-full rounded-lg border border-foreground/15 bg-background py-2.5 px-4 text-center text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background font-mono"
          />
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={loading || code.trim().length === 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {loading ? "Desactivando…" : "Desactivar"}
            </button>
            <Button type="button" variant="ghost" onClick={resetToIdle}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Regenerar códigos — exige un código válido */}
      {step === "regenerating" && (
        <form onSubmit={handleRegenerate} className="space-y-3">
          <p className="text-xs text-foreground/70">Escribe un código actual para generar un set nuevo de respaldo (los anteriores dejan de servir).</p>
          <input
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos o de respaldo"
            className="w-full rounded-lg border border-foreground/15 bg-background py-2.5 px-4 text-center text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background font-mono"
          />
          <div className="flex gap-2.5">
            <Button type="submit" variant="accent" disabled={loading || code.trim().length === 0}>
              {loading ? "Generando…" : "Generar nuevos códigos"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetToIdle}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
