import { Receipt, DownloadSimple } from "@phosphor-icons/react/ssr";
import { EmptyState } from "../dashboard/EmptyState";
import { Badge, type BadgeTone } from "../dashboard/ui/Badge";
import { BoldPayButton } from "./BoldPayButton";
import { formatMoney } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "../dashboard/types";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Por pagar",
  overdue: "Vencida",
  paid: "Pagada",
};

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  pending: "info",
  overdue: "danger",
  paid: "success",
};

/**
 * El cliente sigue sin poder CREAR facturas (eso es exclusivo de
 * /dashboard/facturacion) pero desde acá SÍ puede pagar en línea con
 * tarjeta (Bold) las que tienen saldo pendiente — ver BoldPayButton.tsx.
 * El registro manual de pagos (transferencia, efectivo) sigue existiendo
 * intacto en /dashboard/facturacion para el equipo interno; ambos caminos
 * escriben en la misma tabla `payments`, distinguidos por `provider`.
 */
export function PortalInvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  const totalBalance = invoices.reduce((sum, inv) => sum + Math.max(inv.balance, 0), 0);

  return (
    <section aria-labelledby="portal-invoices-heading" className="space-y-4">
      <div>
        <h2 id="portal-invoices-heading" className="text-lg font-bold text-foreground">Facturas</h2>
        <p className="mt-1 text-xs text-foreground/70">Tu historial de facturación y saldo pendiente.</p>
      </div>

      {invoices.length > 0 && (
        <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-5 max-w-xs space-y-1">
          <span className="text-xs text-foreground/60">Saldo pendiente total</span>
          <div className={`text-xl font-bold font-mono ${totalBalance > 0 ? "text-amber-700" : "text-green-700"}`}>
            {formatMoney(totalBalance, "COP")}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin facturas todavía" description="Cuando tengas una factura emitida, aparecerá acá." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <caption className="sr-only">Tus facturas, con saldo y estado</caption>
              <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[10px] text-foreground/60">
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
                      {inv.invoice_number && <div className="text-[10px] text-foreground/50 font-mono">{inv.invoice_number}</div>}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate">{inv.description}</td>
                    <td className="px-5 py-4 font-mono">
                      <div className={`font-bold ${inv.balance > 0 ? "text-amber-700" : "text-green-700"}`}>
                        {formatMoney(inv.balance, inv.currency)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60">
                      {new Date(inv.due_date).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          aria-label={`Descargar PDF de la factura ${inv.invoice_number || inv.project_title}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <DownloadSimple size={14} />
                        </a>
                        {inv.balance > 0 && <BoldPayButton invoiceId={inv.id} />}
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
