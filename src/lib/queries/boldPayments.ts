import { query } from "../db";

/**
 * Mismo criterio de dueño que `isDocumentOwnedByClient`/
 * `isProjectOwnedByClient` (users.client_id → projects.client_id, nunca
 * por email) — una factura pertenece a un cliente a través de su proyecto.
 */
export async function isInvoiceOwnedByClient(invoiceId: number, clientId: number | string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM invoices i JOIN projects p ON p.id = i.project_id
     WHERE i.id = $1 AND p.client_id = $2 AND i.deleted_at IS NULL;`,
    [invoiceId, clientId]
  );
  return res.rows.length > 0;
}

export interface InvoiceForCheckout {
  id: number;
  description: string;
  currency: string;
  balance: number;
}

/**
 * Datos mínimos para armar el checkout de Bold: el saldo real (monto -
 * suma de pagos ya registrados, del proveedor que sea), nunca el `amount`
 * bruto de la factura — un cliente jamás debe poder pagar de más ni
 * volver a pagar algo que ya saldó (parcialmente a mano, por ejemplo).
 * `null` si la factura no existe, está borrada, o ya no tiene saldo
 * pendiente (`balance <= 0`) — en ese caso no hay nada que cobrar.
 */
export async function getInvoiceForCheckout(invoiceId: number): Promise<InvoiceForCheckout | null> {
  const res = await query(
    `SELECT i.id, i.description, i.currency, i.amount,
            COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) AS paid_amount
     FROM invoices i
     WHERE i.id = $1 AND i.deleted_at IS NULL;`,
    [invoiceId]
  );
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const balance = Number(row.amount) - Number(row.paid_amount);
  if (balance <= 0) return null;

  return {
    id: Number(row.id),
    description: String(row.description ?? ""),
    currency: String(row.currency ?? "COP"),
    balance,
  };
}

export interface RecordBoldPaymentInput {
  invoiceId: number;
  amount: number;
  paidAt: string;
  /** `payment_id` de Bold — clave de idempotencia, ver migración 0021. */
  providerReference: string;
}

export interface RecordBoldPaymentResult {
  /** `false` cuando ya existía un pago con ese `providerReference` — el
   * webhook de Bold reintenta hasta 5 veces si no respondemos 200 a
   * tiempo, y la confirmación al volver del checkout puede correr en
   * paralelo con ese mismo webhook para la misma venta. */
  inserted: boolean;
  paymentId: number | null;
}

/**
 * Inserta el pago solo si `providerReference` no se había registrado
 * antes — `ON CONFLICT ... DO NOTHING` sobre el índice único parcial de
 * la migración 0021, en una sola sentencia (no un SELECT-then-INSERT, que
 * tendría una carrera real entre el webhook y la confirmación del
 * navegador llegando casi al mismo tiempo).
 */
export async function recordBoldPaymentIfNew({
  invoiceId,
  amount,
  paidAt,
  providerReference,
}: RecordBoldPaymentInput): Promise<RecordBoldPaymentResult> {
  const invoiceExists = await query("SELECT id FROM invoices WHERE id = $1 AND deleted_at IS NULL;", [invoiceId]);
  if (invoiceExists.rows.length === 0) return { inserted: false, paymentId: null };

  const res = await query(
    `INSERT INTO payments (invoice_id, amount, paid_at, method, provider, provider_reference)
     VALUES ($1, $2, $3, 'Bold', 'bold', $4)
     ON CONFLICT (provider_reference) WHERE provider_reference IS NOT NULL DO NOTHING
     RETURNING id;`,
    [invoiceId, amount, paidAt, providerReference]
  );

  if (res.rows.length === 0) return { inserted: false, paymentId: null };
  return { inserted: true, paymentId: Number(res.rows[0].id) };
}
