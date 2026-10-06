import { Receipt, DownloadSimple } from "@phosphor-icons/react/ssr";
import { EmptyState } from "../dashboard/EmptyState";
import { Badge } from "../dashboard/ui/Badge";
import { BoldPayButton } from "./BoldPayButton";
import { formatMoney, formatCalendarDate } from "@/lib/utils";
import { StatCard } from "../dashboard/ui/StatCard";
import type { Currency } from "@/lib/currency";
import type { Invoice } from "../dashboard/types";
import { INVOICE_STATUS } from "@/components/dashboard/statusMeta";

/**
 * El cliente sigue sin poder CREAR facturas (eso es exclusivo de
 * /dashboard/facturacion) pero desde acá SÍ puede pagar en línea con
 * tarjeta (Bold) las que tienen saldo pendiente — ver BoldPayButton.tsx.
 * El registro manual de pagos (transferencia, efectivo) sigue existiendo
 * intacto en /dashboard/facturacion para el equipo interno; ambos caminos
 * escriben en la misma tabla `payments`, distinguidos por `provider`.
 */
export function PortalInvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  // Un total por moneda: sumar COP y USD directo daba una cifra sin sentido (y la
  // mostraba toda en pesos).
  const balanceByCurrency = invoices.reduce<Partial<Record<Currency, number>>>((acc, inv) => {
    acc[inv.currency] = (acc[inv.currency] ?? 0) + Math.max(inv.balance, 0);
    return acc;
  }, {});

  return (
    <section aria-labelledby="portal-invoices-heading" className="space-y-4">
      <div>
        <h2 id="portal-invoices-heading" className="text-lg font-bold text-foreground">Facturas</h2>
        <p className="mt-1 text-xs text-foreground/70">Tu historial de facturación y saldo pendiente.</p>
      </div>

      {invoices.length > 0 && (
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.entries(balanceByCurrency) as [Currency, number][])
            // Una moneda sin deuda no aporta si hay otra con saldo.
            .filter(([, total], _i, all) => total > 0 || all.every(([, t]) => t === 0))
            .map(([currency, total]) => (
            <StatCard
              key={currency}
              label={`Saldo pendiente (${currency})`}
              value={formatMoney(total, currency)}
              tone={total > 0 ? "warning" : "success"}
            />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin facturas todavía" description="Cuando tengas una factura emitida, aparecerá acá." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tus facturas, con saldo y estado</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Proyecto</th>
                  <th scope="col" className="px-5 py-3.5">Descripción</th>
                  <th scope="col" className="px-5 py-3.5">Saldo</th>
                  <th scope="col" className="px-5 py-3.5">Estado</th>
                  <th scope="col" className="px-5 py-3.5">Vence</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-4 font-bold text-foreground">
                      {inv.project_title}
                      {inv.invoice_number && <div className="text-[11px] text-foreground/70 font-mono">{inv.invoice_number}</div>}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate">{inv.description}</td>
                    <td className="px-5 py-4 font-mono">
                      <div className={`font-bold ${inv.balance > 0 ? "text-warning" : "text-success"}`}>
                        {formatMoney(inv.balance, inv.currency)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={INVOICE_STATUS[inv.status].tone}>{INVOICE_STATUS[inv.status].clientLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-foreground/70">
                      {formatCalendarDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          aria-label={`Descargar PDF de la factura ${inv.invoice_number || inv.project_title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <DownloadSimple size={14} />
                        </a>
                        {inv.balance > 0 && <BoldPayButton invoiceId={inv.id} amountLabel={formatMoney(inv.balance, inv.currency)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
