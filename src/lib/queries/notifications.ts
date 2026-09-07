import { query } from "../db";
import { sendEmail } from "../email";

/**
 * Marca las propuestas vistas-y-no-avisadas como avisadas en la MISMA
 * consulta que las selecciona (`UPDATE ... RETURNING`) — así, si el envío
 * de un correo individual falla más abajo, esa propuesta no se reintenta
 * en la próxima corrida del cron (mejor un aviso perdido ocasional que
 * bombardear al creador con el mismo correo cada vez que corre el cron).
 * El `LEFT JOIN` a `users` cubre propuestas sin `created_by` (creador
 * borrado, o nunca asignado) — se marcan igual como avisadas, solo que sin
 * destinatario no se envía ningún correo para esa fila.
 */
export async function notifyViewedProposals(): Promise<number> {
  const res = await query(`
    WITH candidates AS (
      SELECT p.id, p.title, p.client_name, u.email AS creator_email
      FROM proposals p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.viewed_at IS NOT NULL AND p.viewed_notified_at IS NULL
    )
    UPDATE proposals p
    SET viewed_notified_at = now()
    FROM candidates c
    WHERE p.id = c.id
    RETURNING c.title, c.client_name, c.creator_email;
  `);

  for (const row of res.rows) {
    if (!row.creator_email) continue;
    await sendEmail({
      to: row.creator_email,
      subject: `Propuesta vista: ${row.title}`,
      text: `${row.client_name} vio la propuesta "${row.title}".\n\nRevisa el estado en /dashboard/propuestas.`,
    });
  }

  return res.rows.length;
}

/**
 * Solo facturas con saldo > 0 y vencimiento pasado (mismo criterio que
 * `status === "overdue"` en getAllInvoices) — una factura ya vencida pero
 * pagada por completo no genera aviso. El saldo se calcula acá con el
 * mismo `amount - SUM(payments)` que usa `getAllInvoices`, no hay una
 * columna `balance` en la tabla.
 */
export async function notifyOverdueInvoices(): Promise<number> {
  const res = await query(`
    WITH invoice_balances AS (
      SELECT i.id, i.project_id, i.description, i.created_by,
             (i.amount - COALESCE(SUM(pay.amount), 0)) AS balance
      FROM invoices i
      LEFT JOIN payments pay ON pay.invoice_id = i.id
      WHERE i.deleted_at IS NULL AND i.overdue_notified_at IS NULL AND i.due_date < CURRENT_DATE
      GROUP BY i.id
    ),
    candidates AS (
      SELECT ib.id, ib.description, ib.balance, p.title AS project_title,
             c.name AS client_name, u.email AS creator_email
      FROM invoice_balances ib
      JOIN projects p ON p.id = ib.project_id
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN users u ON u.id = ib.created_by
      WHERE ib.balance > 0
    )
    UPDATE invoices i
    SET overdue_notified_at = now()
    FROM candidates cd
    WHERE i.id = cd.id
    RETURNING cd.description, cd.balance, cd.project_title, cd.client_name, cd.creator_email;
  `);

  for (const row of res.rows) {
    if (!row.creator_email) continue;
    await sendEmail({
      to: row.creator_email,
      subject: `Factura vencida: ${row.project_title}`,
      text: `La factura "${row.description}" de ${row.client_name} (${row.project_title}) está vencida con un saldo pendiente de ${row.balance}.\n\nRevisa la cobranza en /dashboard/facturacion.`,
    });
  }

  return res.rows.length;
}

// Ventana de aviso: tickets cuyo SLA vence dentro de las próximas 2 horas
// (o que ya vencieron y siguen abiertos) — no configurable en settings a
// propósito, es un umbral de aviso, no una política de SLA (esa sí vive en
// settings.sla_hours_*, ver lib/queries/settings.ts).
const SLA_WARNING_WINDOW_HOURS = 2;

/**
 * Tickets sin resolver cuyo `sla_due_at` ya está a menos de
 * `SLA_WARNING_WINDOW_HOURS` de distancia (o ya vencido) — el `<=` cubre
 * ambos casos en una sola condición: uno "por vencer" y uno "ya vencido
 * pero nadie avisó todavía", deliberado, no un descuido del límite.
 */
export async function notifySlaWarnings(): Promise<number> {
  const res = await query(
    `
    WITH candidates AS (
      SELECT t.id, t.title, t.sla_due_at, p.title AS project_title, u.email AS assignee_email
      FROM support_tickets t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.deleted_at IS NULL AND t.sla_warning_notified_at IS NULL
        AND t.status NOT IN ('Resuelto', 'Cerrado')
        AND t.sla_due_at <= now() + ($1 || ' hours')::interval
    )
    UPDATE support_tickets t
    SET sla_warning_notified_at = now()
    FROM candidates cd
    WHERE t.id = cd.id
    RETURNING cd.title, cd.project_title, cd.assignee_email, cd.sla_due_at;
  `,
    [SLA_WARNING_WINDOW_HOURS]
  );

  for (const row of res.rows) {
    if (!row.assignee_email) continue;
    await sendEmail({
      to: row.assignee_email,
      subject: `SLA por vencer: ${row.title}`,
      text: `El ticket "${row.title}" (${row.project_title}) vence su SLA el ${new Date(row.sla_due_at).toLocaleString("es-CO")}.\n\nRevisa el tablero en /dashboard/soporte.`,
    });
  }

  return res.rows.length;
}
