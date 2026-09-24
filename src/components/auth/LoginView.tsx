"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Envelope, Eye, EyeSlash, Lock, ShieldCheck } from "@phosphor-icons/react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Segundo paso del login (2FA, ver lib/authService.ts) — `pendingToken`
  // solo vive en memoria del navegador, nunca en localStorage/cookie: si
  // se pierde (refresh de página a mitad de flujo), el usuario simplemente
  // vuelve a escribir su contraseña, no hay nada sensible que limpiar.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión.");
      }

      if (data.needsTwoFactor) {
        setPendingToken(data.pendingToken);
        setLoading(false);
        return;
      }

      finishLogin(data.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingToken) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code: totpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      finishLogin(data.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      setLoading(false);
    }
  };

  const finishLogin = (role: string | undefined) => {
    setSuccess(true);
    const destination = role === "client" ? "/portal" : "/dashboard";
    setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-foreground px-4 py-16 text-background overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
            <Image src="/logo-mark.png" alt="SKYCODE Logo" width={140} height={80} className="h-10 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-background">Acceso a Plataforma</h1>
          <p className="mt-1.5 text-xs text-background/80 font-sans">
            {pendingToken ? "Confirma tu identidad con el segundo factor" : "Inicie sesión con sus credenciales de acceso"}
          </p>
        </div>

        <SpotlightCard spotlightSize={350}>
          <div className="rounded-xl border border-background/15 bg-background/5 p-6 backdrop-blur-2xl shadow-2xl">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-3"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400 mx-auto">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-background">¡Autenticación Exitosa!</h3>
                <p className="text-xs text-background/70">Redirigiendo a la consola principal...</p>
              </motion.div>
            ) : pendingToken ? (
              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2.5 rounded-xl border border-background/15 bg-background/10 p-3.5">
                  <ShieldCheck size={18} className="text-accent shrink-0" />
                  <p className="text-[11px] leading-relaxed text-background/80">
                    Escribe el código de 6 dígitos de tu app de autenticación, o uno de tus códigos de respaldo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="totp-code" className="block text-xs font-semibold text-background/80">
                    Código de verificación
                  </label>
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-center text-lg tracking-[0.3em] text-background placeholder:text-background/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.trim().length === 0}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  {loading ? (
                    <span>Verificando…</span>
                  ) : (
                    <>
                      <span>Verificar</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingToken(null);
                    setTotpCode("");
                    setError(null);
                  }}
                  className="flex w-full min-h-11 items-center justify-center gap-1.5 text-[11px] font-medium text-background/60 hover:text-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
                >
                  <ArrowLeft size={12} />
                  <span>Volver a intentar con otra cuenta</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-background/80">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Envelope size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/40" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@skycode.agency"
                      className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 pl-10 pr-4 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground transition-all font-mono"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="block text-xs font-semibold text-background/80">
                      Contraseña
                    </label>
                    <Link
                      href="/olvide-password"
                      className="text-[11px] text-background/60 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/40" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 pl-10 pr-10 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground transition-all font-mono"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-background/40 hover:text-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded p-1"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  {loading ? (
                    <span>Verificando credenciales...</span>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </SpotlightCard>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-background/60 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded px-2 py-1 inline-block">
            ← Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}
