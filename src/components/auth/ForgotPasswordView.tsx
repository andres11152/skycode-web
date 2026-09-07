"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export function ForgotPasswordView() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error inesperado.");
      }

      // El backend responde el mismo mensaje genérico exista o no la
      // cuenta — ver app/api/auth/forgot-password/route.ts. Nunca mostrar
      // acá un mensaje distinto según si "funcionó" o no encontrar la cuenta.
      setMessage(data.message);
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
          <h1 className="text-2xl font-bold tracking-tight text-background">Restablecer contraseña</h1>
          <p className="mt-1.5 text-xs text-background/80 font-sans">
            Ingresa tu correo y te enviamos un enlace para elegir una nueva
          </p>
        </div>

        <SpotlightCard spotlightSize={350}>
          <div className="rounded-xl border border-background/15 bg-background/5 p-6 backdrop-blur-2xl shadow-2xl">
            {message ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-3"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400 mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-background">Revisa tu correo</h3>
                <p className="text-xs text-background/70">{message}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor={emailId} className="block text-xs font-semibold text-background/80">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-background/40" />
                    <input
                      id={emailId}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 active:scale-98 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
                >
                  {loading ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <span>Enviar enlace</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </SpotlightCard>

        <div className="mt-6 flex justify-center gap-4 text-center">
          <Link href="/login" className="text-xs text-background/60 hover:text-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded px-2 py-1 inline-block">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
