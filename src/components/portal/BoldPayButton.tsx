"use client";

import { useState } from "react";
import { CreditCard, Spinner, WarningCircle } from "@phosphor-icons/react";
import { logError } from "@/lib/logger";
import type { BoldCheckoutConfig } from "@/lib/bold";

const BOLD_SCRIPT_SRC = "https://checkout.bold.co/library/boldPaymentButton.js";
const BOLD_SCRIPT_ID = "bold-checkout-library";

// Constructor global que inyecta el script de Bold (checkout.bold.co) —
// no hay tipos oficiales de Bold para esto, se declara el mínimo que se
// usa acá. Ver https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
declare global {
  interface Window {
    BoldCheckout?: new (config: {
      orderId: string;
      amount: string;
      currency: string;
      apiKey: string;
      integritySignature: string;
      description: string;
      redirectionUrl: string;
      renderMode?: "embedded";
    }) => { open: () => void };
  }
}

function loadBoldScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BoldCheckout) {
      resolve();
      return;
    }
    const existing = document.getElementById(BOLD_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar el checkout de Bold.")));
      return;
    }

    const script = document.createElement("script");
    script.id = BOLD_SCRIPT_ID;
    script.src = BOLD_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el checkout de Bold."));
    document.head.appendChild(script);
  });
}

/**
 * Botón "Pagar ahora" en una factura del portal — abre el checkout
 * embebido de Bold (modal, sin salir del sitio) con una configuración
 * firmada que arma el servidor (`POST /api/invoices/[id]/bold-checkout`,
 * nunca en el navegador: el hash de integridad necesita la llave secreta,
 * que jamás sale del backend). El pago en sí se confirma después, al
 * volver de Bold (ver PortalView.tsx) — este componente solo abre el
 * checkout, no sabe si el pago terminó aprobado.
 */
export function BoldPayButton({ invoiceId }: { invoiceId: number }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handlePay() {
    setStatus("loading");
    try {
      const [, res] = await Promise.all([
        loadBoldScript(),
        fetch(`/api/invoices/${invoiceId}/bold-checkout`, { method: "POST" }),
      ]);

      const result = await res.json();
      if (!res.ok || !result.checkout) {
        throw new Error(result.error || "No se pudo iniciar el pago.");
      }

      const config = result.checkout as BoldCheckoutConfig;
      if (!window.BoldCheckout) {
        throw new Error("No se pudo cargar el checkout de Bold.");
      }

      const checkout = new window.BoldCheckout({
        orderId: config.orderId,
        amount: String(config.amount),
        currency: config.currency,
        apiKey: config.apiKey,
        integritySignature: config.integritySignature,
        description: config.description,
        redirectionUrl: config.redirectionUrl,
        renderMode: "embedded",
      });
      checkout.open();
      setStatus("idle");
    } catch (error) {
      logError("Error al abrir el checkout de Bold", error);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handlePay}
        disabled={status === "loading"}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-strong px-4 text-xs font-bold text-white transition-all hover:brightness-90 disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {status === "loading" ? <Spinner size={14} className="animate-spin" /> : <CreditCard size={14} />}
        <span>Pagar ahora</span>
      </button>
      {status === "error" && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-600">
          <WarningCircle size={11} /> No se pudo abrir el pago. Intenta de nuevo.
        </span>
      )}
    </div>
  );
}
