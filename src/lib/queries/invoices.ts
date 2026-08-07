import { query } from "../db";
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
  const res = await query(`
    SELECT i.id, i.project_id, p.title AS project_title, c.name AS client_name,
           i.description, i.amount, i.currency, i.due_date, i.created_at,
           COALESCE(pay.paid_amount, 0) AS paid_amount
    FROM invoices i
    JOIN projects p ON p.id = i.project_id
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN (
      SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
    ) pay ON pay.invoice_id = i.id
    WHERE i.deleted_at IS NULL
    ORDER BY i.due_date ASC;
  `);

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
 * Emite una nueva factura para un proyecto.
 */
export async function createInvoice(data: CreateInvoiceData, userId: number | string, dbRunner: QueryRunner) {
  const projectExists = await dbRunner.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL;", [
    data.project_id,
  ]);
  if (projectExists.rows.length === 0) return null;

  const res = await dbRunner.query(
    `INSERT INTO invoices (project_id, description, amount, currency, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *;`,
    [data.project_id, data.description, data.amount, data.currency || "COP", data.due_date, userId]
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

