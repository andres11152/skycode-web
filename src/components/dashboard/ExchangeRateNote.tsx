import { formatMoney } from "@/lib/utils";

/**
 * Nota de contexto para cualquier vista que sume montos convertidos —
 * deja explícito que los totales agregados no son "la moneda X sumada tal
 * cual" sino una conversión con la tasa vigente (ver lib/currency.ts).
 */
export function ExchangeRateNote({ usdToCopRate }: { usdToCopRate: number }) {
  return (
    <p className="text-[10px] text-foreground/40">
      Totales convertidos a COP con la tasa vigente: 1 USD ≈ {formatMoney(usdToCopRate, "COP")}.
    </p>
  );
}
