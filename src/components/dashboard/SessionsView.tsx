"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, MapPin, ShieldCheck, LogOut } from "lucide-react";
import { Alert } from "./ui/Alert";
import type { SessionUser, UserSessionRow } from "./types";

/**
 * Heurística simple sobre el User-Agent crudo, no una librería de
 * detección — solo para mostrar algo legible ("Chrome en macOS") en vez
 * del string técnico completo. Si no reconoce nada, cae al string crudo
 * truncado — nunca oculta información, en el peor caso es menos bonito.
 */
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconocido";

  const os = userAgent.includes("Mac OS")
    ? "macOS"
    : userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
    ? "Android"
    : userAgent.includes("iPhone") || userAgent.includes("iPad")
    ? "iOS"
    : userAgent.includes("Linux")
    ? "Linux"
    : null;

  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
    ? "Chrome"
    : userAgent.includes("Firefox/")
    ? "Firefox"
    : userAgent.includes("Safari/") && !userAgent.includes("Chrome")
    ? "Safari"
    : null;

  if (browser && os) return `${browser} en ${os}`;
  if (browser) return browser;
  if (os) return os;
  return userAgent.length > 60 ? `${userAgent.slice(0, 60)}…` : userAgent;
}

export function SessionsView({
  user,
  sessions: initialSessions,
  currentSessionId,
}: {
  user: SessionUser;
  sessions: UserSessionRow[];
  currentSessionId: string | null;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async (sessionId: string) => {
    setError(null);
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo cerrar la sesión.");
        return;
      }

      if (sessionId === currentSessionId) {
        // Revocar la sesión propia actual equivale a un logout — el
        // próximo request con esta cookie ya no resuelve.
        router.push("/login");
        router.refresh();
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Ocurrió un error de red. Intente de nuevo.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Cuenta</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Sesiones activas de {user.name} — cierre las que no reconozca
        </p>
      </div>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 space-y-1">
        <div className="text-xs text-foreground/60">Correo</div>
        <div className="text-sm font-mono text-foreground">{user.email}</div>
        <div className="mt-3 text-xs text-foreground/60">Rol</div>
        <div className="text-sm font-mono uppercase text-foreground/80">{user.role}</div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground/90">
            <caption className="sr-only">Sesiones activas de la cuenta, con dispositivo, IP y vigencia</caption>
            <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
              <tr>
                <th scope="col" className="px-5 py-3.5">Dispositivo</th>
                <th scope="col" className="px-5 py-3.5">IP</th>
                <th scope="col" className="px-5 py-3.5">Iniciada</th>
                <th scope="col" className="px-5 py-3.5">Expira</th>
                <th scope="col" className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {sessions.map((s) => {
                const isCurrent = s.id === currentSessionId;
                return (
                  <tr key={s.id} className={isCurrent ? "bg-accent/5" : ""}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-foreground/40 shrink-0" />
                        <span>{describeUserAgent(s.user_agent)}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                            <ShieldCheck size={10} />
                            Esta sesión
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-foreground/60">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-foreground/40" />
                        {s.ip || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-foreground/60 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-foreground/60 whitespace-nowrap">
                      {new Date(s.expires_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={revokingId === s.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-500/20 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <LogOut size={12} />
                        {isCurrent ? "Cerrar sesión" : "Revocar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
