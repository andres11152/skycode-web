"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Eye, EyeSlash, Lock } from "@phosphor-icons/react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export function ResetPasswordView({ token }: { token: string }) {
  const router = useRouter();
  const passwordId = useId();
  const confirmId = useId();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo restablecer la contraseña.");
      }

      setSuccess(true);
      const destination = data.user?.role === "client" ? "/portal" : "/dashboard";
      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-foreground px-4 py-16 text-background overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
            <Image src="/logo-mark.png" alt="SKYCODE Logo" width={140} height={80} className="h-10 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-background">Elige una nueva contraseña</h1>
          <p className="mt-1.5 text-xs text-background/80 font-sans">
            Al confirmar, se cierran todas tus sesiones activas por seguridad
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
                <h3 className="text-lg font-bold text-background">¡Contraseña actualizada!</h3>
                <p className="text-xs text-background/70">Redirigiendo...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor={passwordId} className="block text-xs font-semibold text-background/80">
                    Nueva contraseña (mínimo 12 caracteres)
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/40" />
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={12}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 pl-10 pr-10 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground transition-all font-mono"
                      autoComplete="new-password"
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

                <div className="space-y-1.5">
                  <label htmlFor={confirmId} className="block text-xs font-semibold text-background/80">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/40" />
                    <input
                      id={confirmId}
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={12}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 pl-10 pr-4 text-xs text-background placeholder:text-background/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground transition-all font-mono"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  {loading ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <span>Restablecer y entrar</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </SpotlightCard>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-background/60 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded px-2 py-1 inline-block">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
