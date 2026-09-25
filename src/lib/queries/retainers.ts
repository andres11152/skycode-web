import { query, withTransaction } from "../db";
import { consumeNextInvoiceNumber } from "./settings";
import type { Currency } from "../currency";
import type { Retainer, RetainerStatus } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

const RETAINERS_SELECT = `
  SELECT r.id, r.client_id, c.name AS client_name, r.project_id, p.title AS project_title,
         r.description, r.amount, r.currency, r.billing_day, r.status,
         r.next_invoice_date::text AS next_invoice_date, r.created_at
  FROM retainers r
  JOIN clients c ON c.id = r.client_id
  JOIN projects p ON p.id = r.project_id
`;

function shapeRetainerRow(row: Record<string, unknown>): Retainer {
  return {
    id: Number(row.id),
    client_id: Number(row.client_id),
    client_name: String(row.client_name),
    project_id: Number(row.project_id),
    project_title: String(row.project_title),
    description: String(row.description),
    amount: Number(row.amount),
    currency: row.currency as Currency,
    billing_day: Number(row.billing_day),
    status: row.status as RetainerStatus,
    next_invoice_date: String(row.next_invoice_date),
    created_at: String(row.created_at),
  };
}

export async function getRetainers(): Promise<Retainer[]> {
  const res = await query(`${RETAINERS_SELECT} WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC;`);
  return res.rows.map(shapeRetainerRow);
}

export interface CreateRetainerData {
  project_id: number;
  description: string;
  amount: number;
  currency?: string;
  billing_day: number;
  next_invoice_date: string;
}

/**
 * `client_id` se deriva del proyecto, no se pide en el formulario — un
 * proyecto ya pertenece a un único cliente, pedirlo aparte solo abriría
 * la puerta a una combinación cruzada inválida (proyecto de un cliente,
 * facturado a nombre de otro) que las foreign keys por sí solas no
 * detectarían.
 */
export async function createRetainer(
  data: CreateRetainerData,
  createdBy: number | string,
  dbRunner: QueryRunner
): Promise<number | null> {
  const projectRes = await dbRunner.query(
    `SELECT client_id FROM projects WHERE id = $1 AND deleted_at IS NULL;`,
    [data.project_id]
  );
  if (projectRes.rows.length === 0) return null;
  const clientId = projectRes.rows[0].client_id;

  const res = await dbRunner.query(
    `INSERT INTO retainers (client_id, project_id, description, amount, currency, billing_day, next_invoice_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id;`,
    [
      clientId,
      data.project_id,
      data.description,
      data.amount,
      data.currency || "COP",
      data.billing_day,
      data.next_invoice_date,
      createdBy,
    ]
  );
  return Number(res.rows[0].id);
}

export interface UpdateRetainerData {
  status?: RetainerStatus;
  amount?: number;
  description?: string;
}

export async function updateRetainer(id: number, data: UpdateRetainerData, dbRunner: QueryRunner): Promise<boolean> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    params.push(data.status);
  }
  if (data.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    params.push(data.amount);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${idx++}`);
    params.push(data.description);
  }
  if (fields.length === 0) return false;

  params.push(id);
  const res = await dbRunner.query(
    `UPDATE retainers SET ${fields.join(", ")} WHERE id = $${idx} AND deleted_at IS NULL RETURNING id;`,
    params
  );
  return res.rows.length > 0;
}

export async function softDeleteRetainer(id: number, dbRunner: QueryRunner): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE retainers SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id;`,
    [id]
  );
  return res.rows.length > 0;
}

/**
 * Genera una factura por cada retainer activo cuyo `next_invoice_date` ya
 * llegó o pasó — pensado para un Render Cron Job diario (mismo patrón de
 * `x-cron-secret` que el resto de crons). Cada retainer se procesa en su
 * PROPIA transacción (factura + avance de fecha juntos, nunca uno sin el
 * otro) para que un fallo puntual en uno no afecte a los demás — mismo
 * criterio de "mejor esfuerzo, independiente por fila" que
 * `lib/queries/notifications.ts`.
 *
 * `next_invoice_date + interval '1 month'` (no `+ 30 días`) para que el
 * ciclo respete el día del mes real — mismo día cada vez, sin ir
 * desplazándose. Si el cron se atrasa (no corrió un día puntual),
 * `next_invoice_date` queda en el pasado y la próxima corrida lo detecta
 * igual (`<= CURRENT_DATE`), generando esa factura atrasada — no se
 * pierde ningún ciclo, pero tampoco se generan dos facturas de golpe por
 * el mismo período: cada corrida solo mira si YA llegó la fecha, avanza
 * un mes, y listo.
 */
export async function generateDueRetainerInvoices(): Promise<number> {
  const dueRes = await query(
    `SELECT id, project_id, description, amount, currency, next_invoice_date::text AS next_invoice_date, created_by
     FROM retainers
     WHERE deleted_at IS NULL AND status = 'active' AND next_invoice_date <= CURRENT_DATE;`
  );

  let generated = 0;
  for (const retainer of dueRes.rows) {
    await withTransaction(async (client) => {
      const invoiceNumber = await consumeNextInvoiceNumber(client);
      await client.query(
        `INSERT INTO invoices (project_id, invoice_number, description, amount, currency, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          retainer.project_id,
          invoiceNumber,
          `Retainer mensual — ${retainer.description}`,
          retainer.amount,
          retainer.currency,
          retainer.next_invoice_date,
          retainer.created_by,
        ]
      );
      await client.query(
        `UPDATE retainers SET next_invoice_date = (next_invoice_date + interval '1 month')::date WHERE id = $1;`,
        [retainer.id]
      );
    });
    generated++;
  }
  return generated;
}
