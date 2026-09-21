"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { Settings } from "@/lib/queries/settings";
import { Field, FieldGroup } from "./ui/Field";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Parámetros globales de la agencia — antes hardcodeados en el código, ahora editables acá.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">Configuración guardada.</Alert>}

        <FieldGroup title="Facturación" description="Tasa de impuesto sugerida al crear una propuesta, y el prefijo de numeración de facturas nuevas.">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              id="default-tax-rate"
              label="Tasa de impuesto por defecto (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={defaultTaxRatePct}
              onChange={(e) => setDefaultTaxRatePct(e.target.value)}
            />
            <Field
              id="invoice-prefix"
              label="Prefijo de numeración"
              type="text"
              required
              maxLength={20}
              value={invoiceNumberPrefix}
              onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
              placeholder="FAC-"
            />
          </div>
          <p className="text-[10px] text-foreground/50">
            La siguiente factura se numerará <span className="font-mono text-foreground/70">{invoiceNumberPrefix}{String(initialSettings.invoiceNextNumber).padStart(4, "0")}</span>. El número consecutivo no es editable acá — avanza solo con cada factura emitida.
          </p>
        </FieldGroup>

        <FieldGroup title="SLA de soporte" description="Horas de plazo por prioridad para tickets nuevos — no afecta el vencimiento de tickets ya creados.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field id="sla-urgente" label="Urgente" type="number" min="1" value={slaHoursUrgente} onChange={(e) => setSlaHoursUrgente(e.target.value)} />
            <Field id="sla-alta" label="Alta" type="number" min="1" value={slaHoursAlta} onChange={(e) => setSlaHoursAlta(e.target.value)} />
            <Field id="sla-media" label="Media" type="number" min="1" value={slaHoursMedia} onChange={(e) => setSlaHoursMedia(e.target.value)} />
            <Field id="sla-baja" label="Baja" type="number" min="1" value={slaHoursBaja} onChange={(e) => setSlaHoursBaja(e.target.value)} />
          </div>
        </FieldGroup>

        <FieldGroup title="Tasa de cambio" description="Por defecto se usa la tasa en vivo (actualizada cada 12h). Fijar una tasa manual la reemplaza por completo hasta que se borre este campo — útil para un período o contrato con tasa acordada.">
          <div className="max-w-xs">
            <Field
              id="manual-rate"
              label="Tasa manual USD → COP (opcional)"
              type="number"
              min="0"
              step="0.01"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Vacío = usar tasa en vivo"
            />
          </div>
        </FieldGroup>

        <Button type="submit" variant="accent" disabled={isSaving} className="px-5 py-3">
          <Save size={14} />
          <span>{isSaving ? "Guardando..." : "Guardar cambios"}</span>
        </Button>
      </form>
    </div>
  );
}
