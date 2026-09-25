import { query } from "../db";
import { consumeNextInvoiceNumber } from "./settings";
import type { Invoice } from "@/components/dashboard/types";

/**
 * `sales_manager` tiene `invoices:read` sobre TODAS las facturas, no solo
 * "sus ventas" como pedía la matriz original — hacerlo por vendedor
 * requeriría trazar lead → propuesta → proyecto → factura, y hoy un lead
 * ganado no queda enlazado a la propuesta/proyecto que generó (se crean
 * por separado). Se documenta como simplificación consciente, no como
 * descuido: si se necesita ese recorte más adelante, hay que enlazar
 * primero `leads` con la propuesta que los convirtió.
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  return queryInvoices();
}

/**
 * Solo las facturas de un cliente puntual (portal, solo lectura) —
 * `clientId` viene de `session.clientId`, nunca de un email (mismo
 * criterio que `getClientProjects`). Reutiliza `queryInvoices()` con un
 * filtro extra en vez de duplicar el cálculo de saldo/estado/pagos.
 */
export async function getClientInvoices(clientId: number | string): Promise<Invoice[]> {
  return queryInvoices(clientId);
}

async function queryInvoices(clientId?: number | string): Promise<Invoice[]> {
  const params: unknown[] = [];
  let clientFilter = "";
  if (clientId !== undefined) {
    params.push(clientId);
    clientFilter = `AND c.id = $${params.length}`;
  }

  const res = await query(
    `
    SELECT i.id, i.invoice_number, i.project_id, p.title AS project_title, c.name AS client_name,
           i.description, i.amount, i.currency, i.due_date, i.created_at,
           COALESCE(pay.paid_amount, 0) AS paid_amount
    FROM invoices i
    JOIN projects p ON p.id = i.project_id
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN (
      SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
    ) pay ON pay.invoice_id = i.id
    WHERE i.deleted_at IS NULL ${clientFilter}
    ORDER BY i.due_date ASC;
  `,
    params
  );

  const invoices: Invoice[] = [];
  for (const row of res.rows) {
    const amount = Number(row.amount);
    const paidAmount = Number(row.paid_amount);
    const balance = amount - paidAmount;

    let status: Invoice["status"] = "pending";
    let daysOverdue = 0;
    if (balance <= 0) {
      status = "paid";
    } else {
      const diffDays = Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        status = "overdue";
        daysOverdue = diffDays;
      }
    }

    const paymentsRes = await query(
      `SELECT id, amount, paid_at, method FROM payments WHERE invoice_id = $1 ORDER BY paid_at DESC;`,
      [row.id]
    );

    invoices.push({
      id: row.id,
      invoice_number: row.invoice_number,
      project_id: row.project_id,
      project_title: row.project_title,
      client_name: row.client_name,
      description: row.description,
      amount,
      currency: row.currency,
      due_date: row.due_date,
      created_at: row.created_at,
      paidAmount,
      balance,
      status,
      daysOverdue,
      payments: paymentsRes.rows.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paid_at: p.paid_at,
        method: p.method,
      })),
    });
  }

  return invoices;
}

export interface InvoicePdfData {
  id: number;
  invoice_number: string;
  project_title: string;
  client_name: string;
  client_email: string;
  client_company: string | null;
  description: string;
  amount: number;
  currency: string;
  due_date: string;
  created_at: string;
  paidAmount: number;
  balance: number;
  status: Invoice["status"];
  daysOverdue: number;
  payments: { id: number; amount: number; paid_at: string; method: string | null }[];
}

/**
 * Datos de una factura puntual para el PDF descargable — mismo cálculo de
 * saldo/estado/pagos que `queryInvoices()` (no lo duplica en SQL, pero sí
 * repite la lógica en JS porque acá hace falta además el email/empresa
 * del cliente, que las vistas de tabla no necesitan mostrar). `null` si
 * la factura no existe o está borrada.
 */
export async function getInvoiceForPdf(id: number): Promise<InvoicePdfData | null> {
  const res = await query(
    `SELECT i.id, i.invoice_number, i.project_id, p.title AS project_title,
            c.name AS client_name, c.email AS client_email, c.company AS client_company,
            i.description, i.amount, i.currency, i.due_date, i.created_at,
            COALESCE(pay.paid_amount, 0) AS paid_amount
     FROM invoices i
     JOIN projects p ON p.id = i.project_id
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN (
       SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
     ) pay ON pay.invoice_id = i.id
     WHERE i.id = $1 AND i.deleted_at IS NULL;`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;

  const amount = Number(row.amount);
  const paidAmount = Number(row.paid_amount);
  const balance = amount - paidAmount;

  let status: Invoice["status"] = "pending";
  let daysOverdue = 0;
  if (balance <= 0) {
    status = "paid";
  } else {
    const diffDays = Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      status = "overdue";
      daysOverdue = diffDays;
    }
  }

  const paymentsRes = await query(
    `SELECT id, amount, paid_at, method FROM payments WHERE invoice_id = $1 ORDER BY paid_at ASC;`,
    [id]
  );

  return {
    id: row.id,
    invoice_number: row.invoice_number,
    project_title: row.project_title,
    client_name: row.client_name,
    client_email: row.client_email,
    client_company: row.client_company,
    description: row.description,
    amount,
    currency: row.currency,
    due_date: row.due_date,
    created_at: row.created_at,
    paidAmount,
    balance,
    status,
    daysOverdue,
    payments: paymentsRes.rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paid_at: p.paid_at,
      method: p.method,
    })),
  };
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateInvoiceData {
  project_id: number;
  description: string;
  amount: number;
  currency?: string;
  due_date: string;
}

/**
 * Emite una nueva factura para un proyecto. El número legible
 * (`invoice_number`, ej. "FAC-0001") se genera atómicamente desde
 * `settings.invoice_next_number` (ver `consumeNextInvoiceNumber`) —
 * `dbRunner` debe ser una transacción para que el número consumido y la
 * fila de factura se confirmen (o reviertan) juntos.
 */
export async function createInvoice(data: CreateInvoiceData, userId: number | string, dbRunner: QueryRunner) {
  const projectExists = await dbRunner.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL;", [
    data.project_id,
  ]);
  if (projectExists.rows.length === 0) return null;

  const invoiceNumber = await consumeNextInvoiceNumber(dbRunner);

  const res = await dbRunner.query(
    `INSERT INTO invoices (project_id, invoice_number, description, amount, currency, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *;`,
    [data.project_id, invoiceNumber, data.description, data.amount, data.currency || "COP", data.due_date, userId]
  );
  return res.rows[0];
}

export interface RecordPaymentData {
  amount: number;
  paid_at: string;
  method?: string;
}

/**
 * Registra un pago/abono contra una factura.
 */
export async function recordInvoicePayment(
  invoiceId: number,
  data: RecordPaymentData,
  userId: number | string,
  dbRunner: QueryRunner
) {
  const invoiceExists = await dbRunner.query("SELECT id FROM invoices WHERE id = $1 AND deleted_at IS NULL;", [
    invoiceId,
  ]);
  if (invoiceExists.rows.length === 0) return null;

  const res = await dbRunner.query(
    `INSERT INTO payments (invoice_id, amount, paid_at, method, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, invoice_id, amount, paid_at, method;`,
    [invoiceId, data.amount, data.paid_at, data.method || null, userId]
  );
  return res.rows[0];
}

