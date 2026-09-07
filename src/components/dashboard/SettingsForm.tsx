"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { Settings } from "@/lib/queries/settings";

function FieldGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-background/15 bg-background/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-background">{title}</h2>
        <p className="mt-0.5 text-[11px] text-background/60">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const router = useRouter();
  const [defaultTaxRatePct, setDefaultTaxRatePct] = useState(String(initialSettings.defaultTaxRatePct));
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState(initialSettings.invoiceNumberPrefix);
  const [slaHoursUrgente, setSlaHoursUrgente] = useState(String(initialSettings.slaHoursUrgente));
  const [slaHoursAlta, setSlaHoursAlta] = useState(String(initialSettings.slaHoursAlta));
  const [slaHoursMedia, setSlaHoursMedia] = useState(String(initialSettings.slaHoursMedia));
  const [slaHoursBaja, setSlaHoursBaja] = useState(String(initialSettings.slaHoursBaja));
  const [manualRate, setManualRate] = useState(initialSettings.manualUsdToCopRate !== null ? String(initialSettings.manualUsdToCopRate) : "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_tax_rate_pct: Number(defaultTaxRatePct) || 0,
          invoice_number_prefix: invoiceNumberPrefix,
          sla_hours_urgente: Number(slaHoursUrgente) || 1,
          sla_hours_alta: Number(slaHoursAlta) || 1,
          sla_hours_media: Number(slaHoursMedia) || 1,
          sla_hours_baja: Number(slaHoursBaja) || 1,
          manual_usd_to_cop_rate: manualRate.trim() ? Number(manualRate) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar la configuración.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Ocurrió un error de red al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-background">Configuración</h1>
        <p className="mt-1 text-xs text-background/70 font-sans">
          Parámetros globales de la agencia — antes hardcodeados en el código, ahora editables acá.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300" role="status">
            Configuración guardada.
          </div>
        )}

        <FieldGroup title="Facturación" description="Tasa de impuesto sugerida al crear una propuesta, y el prefijo de numeración de facturas nuevas.">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="default-tax-rate" className="block text-xs font-semibold text-background/80">Tasa de impuesto por defecto (%)</label>
              <input
                id="default-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={defaultTaxRatePct}
                onChange={(e) => setDefaultTaxRatePct(e.target.value)}
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invoice-prefix" className="block text-xs font-semibold text-background/80">Prefijo de numeración</label>
              <input
                id="invoice-prefix"
                type="text"
                required
                maxLength={20}
                value={invoiceNumberPrefix}
                onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
                placeholder="FAC-"
                className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono"
              />
            </div>
          </div>
          <p className="text-[10px] text-background/50">
            La siguiente factura se numerará <span className="font-mono text-background/70">{invoiceNumberPrefix}{String(initialSettings.invoiceNextNumber).padStart(4, "0")}</span>. El número consecutivo no es editable acá — avanza solo con cada factura emitida.
          </p>
        </FieldGroup>

        <FieldGroup title="SLA de soporte" description="Horas de plazo por prioridad para tickets nuevos — no afecta el vencimiento de tickets ya creados.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="sla-urgente" className="block text-xs font-semibold text-background/80">Urgente</label>
              <input id="sla-urgente" type="number" min="1" value={slaHoursUrgente} onChange={(e) => setSlaHoursUrgente(e.target.value)} className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sla-alta" className="block text-xs font-semibold text-background/80">Alta</label>
              <input id="sla-alta" type="number" min="1" value={slaHoursAlta} onChange={(e) => setSlaHoursAlta(e.target.value)} className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sla-media" className="block text-xs font-semibold text-background/80">Media</label>
              <input id="sla-media" type="number" min="1" value={slaHoursMedia} onChange={(e) => setSlaHoursMedia(e.target.value)} className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sla-baja" className="block text-xs font-semibold text-background/80">Baja</label>
              <input id="sla-baja" type="number" min="1" value={slaHoursBaja} onChange={(e) => setSlaHoursBaja(e.target.value)} className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background outline-none focus:border-accent font-mono" />
            </div>
          </div>
        </FieldGroup>

        <FieldGroup title="Tasa de cambio" description="Por defecto se usa la tasa en vivo (actualizada cada 12h). Fijar una tasa manual la reemplaza por completo hasta que se borre este campo — útil para un período o contrato con tasa acordada.">
          <div className="space-y-1.5 max-w-xs">
            <label htmlFor="manual-rate" className="block text-xs font-semibold text-background/80">Tasa manual USD → COP (opcional)</label>
            <input
              id="manual-rate"
              type="number"
              min="0"
              step="0.01"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Vacío = usar tasa en vivo"
              className="w-full rounded-xl border border-background/15 bg-background/10 py-2.5 px-4 text-xs text-background placeholder:text-background/40 outline-none focus:border-accent font-mono"
            />
          </div>
        </FieldGroup>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-accent-strong px-5 py-3 text-xs font-bold text-white shadow-lg hover:brightness-90 transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
        >
          <Save size={14} />
          <span>{isSaving ? "Guardando..." : "Guardar cambios"}</span>
        </button>
      </form>
    </div>
  );
}
