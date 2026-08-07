"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { Proposal } from "@/components/dashboard/types";

export function ProposalView({ proposal }: { proposal: Proposal }) {
  const [status, setStatus] = useState(proposal.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "reject") => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar tu respuesta.");
        return;
      }
      setStatus(action === "accept" ? "accepted" : "rejected");
    } catch {
      setError("Ocurrió un error de red. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRespond = status === "sent" || status === "viewed";

  return (
    <div className="min-h-screen bg-foreground text-background px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
            <Image src="/logo-mark.png" alt="SKYCODE Logo" width={140} height={80} className="h-10 w-auto mx-auto" />
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-wider text-background/50">Propuesta Comercial</span>
          <h1 className="text-2xl font-bold tracking-tight text-background mt-1">{proposal.title}</h1>
          <p className="mt-1 text-xs text-background/60">Para {proposal.client_name}</p>
        </div>

        <div className="rounded-xl border border-background/15 bg-background/5 p-6 space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-background/10 font-mono uppercase text-[10px] text-background/50">
                <tr>
                  <th className="pb-2">Partida</th>
                  <th className="pb-2 text-center">Cant.</th>
                  <th className="pb-2 text-right">Precio</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background/10">
                {proposal.items.map((item, i) => (
                  <tr key={item.id ?? i}>
                    <td className="py-2.5 text-background/90">{item.description}</td>
                    <td className="py-2.5 text-center font-mono text-background/70">{item.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-background/70">
                      {formatMoney(item.unit_price, proposal.currency)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-background/90">
                      {formatMoney(item.quantity * item.unit_price, proposal.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-background/10 pt-4 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-background/60">
              <span>Subtotal</span>
              <span>{formatMoney(proposal.subtotal, proposal.currency)}</span>
            </div>
            {proposal.tax_rate > 0 && (
              <div className="flex justify-between text-background/60">
                <span>Impuesto ({proposal.tax_rate}%)</span>
                <span>{formatMoney(proposal.total - proposal.subtotal, proposal.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-background pt-1.5 border-t border-background/10">
              <span>Total</span>
              <span className="text-green-400">{formatMoney(proposal.total, proposal.currency)}</span>
            </div>
          </div>

          {proposal.notes && (
            <div className="border-t border-background/10 pt-4 text-xs text-background/70 whitespace-pre-wrap">
              {proposal.notes}
            </div>
          )}

          {proposal.valid_until && canRespond && (
            <p className="text-[11px] text-background/50 flex items-center gap-1.5">
              <Clock size={12} />
              Vigente hasta {new Date(proposal.valid_until).toLocaleDateString("es-CO")}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {status === "accepted" && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-semibold text-green-400">
            <CheckCircle2 size={18} />
            <span>Propuesta aceptada. Nos pondremos en contacto para arrancar el proyecto.</span>
          </div>
        )}
        {status === "rejected" && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
            <XCircle size={18} />
            <span>Propuesta rechazada. Gracias por tu tiempo.</span>
          </div>
        )}
        {status === "expired" && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-background/20 bg-background/5 p-4 text-sm font-semibold text-background/60">
            <AlertTriangle size={18} />
            <span>Esta propuesta ya expiró — contáctanos si sigue interesado.</span>
          </div>
        )}

        {canRespond && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => respond("accept")}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-sm font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              <CheckCircle2 size={16} />
              <span>Aceptar Propuesta</span>
            </button>
            <button
              onClick={() => respond("reject")}
              disabled={isSubmitting}
              className="rounded-xl border border-background/20 px-4 py-3 text-sm font-medium text-background/80 hover:bg-background/10 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
