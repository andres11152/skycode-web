import { Receipt } from "lucide-react";
import { EmptyState } from "../dashboard/EmptyState";
import { formatMoney } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "../dashboard/types";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Por pagar",
  overdue: "Vencida",
  paid: "Pagada",
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: "bg-sky-500/10 border border-sky-500/20 text-sky-700",
  overdue: "bg-red-500/10 border border-red-500/20 text-red-700",
  paid: "bg-green-500/10 border border-green-500/20 text-green-700",
};

/**
 * Solo lectura a propósito — el portal del cliente no crea facturas ni
 * registra pagos, esas acciones siguen siendo exclusivas del equipo
 * interno en /dashboard/facturacion. Este panel existe para que el
 * cliente vea su saldo sin tener que pedirlo por correo/WhatsApp.
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
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[10px] text-foreground/60">
                      {new Date(inv.due_date).toLocaleDateString("es-CO")}
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
