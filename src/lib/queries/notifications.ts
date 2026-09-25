import { query } from "../db";
import { sendEmail } from "../email";
import { sendPushToUser } from "../webPush";
import type { AppNotification } from "@/components/dashboard/types";

interface NewNotification {
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
}

/**
 * Inserta la campanita in-app para el mismo evento que ya dispara el
 * correo — un solo `notify*()` alimenta los tres canales (in-app, correo,
 * push del navegador) desde la misma condición de "candidato", nunca hay
 * una segunda fuente de verdad. Se llama una vez por fila con dueño
 * conocido; sin dueño, el correo ya se salta (`if (!row.x_email) continue`)
 * y esta función ni se invoca — la fila se marcó igual como avisada en su
 * tabla de origen. El push (`sendPushToUser`, ver lib/webPush.ts) es un
 * no-op silencioso sin las variables VAPID configuradas o sin
 * suscripciones activas del usuario — nunca bloquea ni falla el resto del
 * flujo si el envío del push individual falla.
 */
async function createNotification({ userId, type, title, body, link }: NewNotification): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5);`,
    [userId, type, title, body, link ?? null]
  );
  await sendPushToUser(userId, { title, body, link });
}

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
      SELECT p.id, p.title, p.client_name, p.created_by, u.email AS creator_email
      FROM proposals p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.viewed_at IS NOT NULL AND p.viewed_notified_at IS NULL
    )
    UPDATE proposals p
    SET viewed_notified_at = now()
    FROM candidates c
    WHERE p.id = c.id
    RETURNING c.title, c.client_name, c.created_by, c.creator_email;
  `);

  for (const row of res.rows) {
    if (!row.created_by) continue;
    await createNotification({
      userId: row.created_by,
      type: "proposal_viewed",
      title: "Propuesta vista",
      body: `${row.client_name} vio la propuesta "${row.title}".`,
      link: "/dashboard/propuestas",
    });
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
      SELECT ib.id, ib.description, ib.balance, ib.created_by, p.title AS project_title,
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
    RETURNING cd.description, cd.balance, cd.created_by, cd.project_title, cd.client_name, cd.creator_email;
  `);

  for (const row of res.rows) {
    if (!row.created_by) continue;
    await createNotification({
      userId: row.created_by,
      type: "invoice_overdue",
      title: "Factura vencida",
      body: `La factura "${row.description}" de ${row.client_name} (${row.project_title}) tiene un saldo pendiente de ${row.balance}.`,
      link: "/dashboard/facturacion",
    });
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
      SELECT t.id, t.title, t.sla_due_at, t.assignee_id, p.title AS project_title, u.email AS assignee_email
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
    RETURNING cd.title, cd.project_title, cd.assignee_id, cd.assignee_email, cd.sla_due_at;
  `,
    [SLA_WARNING_WINDOW_HOURS]
  );

  for (const row of res.rows) {
    if (!row.assignee_id) continue;
    await createNotification({
      userId: row.assignee_id,
      type: "sla_warning",
      title: "SLA por vencer",
      body: `El ticket "${row.title}" (${row.project_title}) vence su SLA el ${new Date(row.sla_due_at).toLocaleString("es-CO")}.`,
      link: "/dashboard/soporte",
    });
    if (!row.assignee_email) continue;
    await sendEmail({
      to: row.assignee_email,
      subject: `SLA por vencer: ${row.title}`,
      text: `El ticket "${row.title}" (${row.project_title}) vence su SLA el ${new Date(row.sla_due_at).toLocaleString("es-CO")}.\n\nRevisa el tablero en /dashboard/soporte.`,
    });
  }

  return res.rows.length;
}

/**
 * Leads con un recontacto agendado (`next_follow_up_at`) que ya llegó o
 * pasó, sin avisar todavía — mismo criterio de "por vencer o ya vencido,
 * una sola condición" que `notifySlaWarnings()`. Excluye leads ya
 * cerrados (`Ganado`/`Perdido`): no tiene sentido recordar seguir un trato
 * que ya se cerró, aunque alguien haya dejado un recordatorio viejo sin
 * borrar. Sin dueño asignado, la fila se marca igual como avisada (para no
 * reintentarla cada hora) pero no se envía ningún correo ni notificación
 * — mismo patrón que el resto de `notify*()` de este archivo.
 */
export async function notifyLeadFollowUps(): Promise<number> {
  const res = await query(`
    WITH candidates AS (
      SELECT l.id, l.name, l.next_follow_up_at, l.follow_up_note, l.owner_id, u.email AS owner_email
      FROM leads l
      LEFT JOIN users u ON u.id = l.owner_id
      WHERE l.deleted_at IS NULL
        AND l.follow_up_notified_at IS NULL
        AND l.next_follow_up_at IS NOT NULL
        AND l.next_follow_up_at <= CURRENT_DATE
        AND l.status NOT IN ('Ganado', 'Perdido')
    )
    UPDATE leads l
    SET follow_up_notified_at = now()
    FROM candidates c
    WHERE l.id = c.id
    RETURNING c.name, c.follow_up_note, c.owner_id, c.owner_email;
  `);

  for (const row of res.rows) {
    if (!row.owner_id) continue;
    await createNotification({
      userId: row.owner_id,
      type: "lead_follow_up",
      title: "Seguimiento pendiente",
      body: `Hoy toca recontactar a ${row.name}.${row.follow_up_note ? ` Nota: ${row.follow_up_note}` : ""}`,
      link: "/dashboard/leads",
    });
    if (!row.owner_email) continue;
    await sendEmail({
      to: row.owner_email,
      subject: `Seguimiento pendiente: ${row.name}`,
      text: `Hoy toca recontactar a ${row.name}.${row.follow_up_note ? `\n\nNota: ${row.follow_up_note}` : ""}\n\nRevisa el lead en /dashboard/leads.`,
    });
  }

  return res.rows.length;
}

/**
 * Últimas notificaciones del usuario autenticado, más el conteo de no
 * leídas — dos consultas separadas (no una sola con `COUNT(*) OVER()`
 * filtrado distinto) porque el conteo de no leídas necesita ver TODA la
 * tabla del usuario, no solo la página de `limit` que se muestra en el
 * dropdown.
 */
export async function getUserNotifications(
  userId: number | string,
  limit = 20
): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const [listRes, countRes] = await Promise.all([
    query(
      `SELECT id, type, title, body, link, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2;`,
      [userId, limit]
    ),
    query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL;`, [userId]),
  ]);

  const notifications: AppNotification[] = listRes.rows.map((row) => ({
    id: Number(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    link: row.link ? String(row.link) : null,
    read: row.read_at !== null,
    created_at: String(row.created_at),
  }));

  return { notifications, unreadCount: Number(countRes.rows[0].count) };
}

/**
 * Marca una notificación como leída — `WHERE user_id = $2` es la única
 * barrera contra marcar la de otra persona, mismo criterio que
 * `revokeOwnSession()`. Devuelve `false` sin tocar nada si no es del
 * usuario (o no existe), para que la ruta responda 404 en vez de 200 sin
 * efecto.
 */
export async function markNotificationRead(id: number, userId: number | string): Promise<boolean> {
  const res = await query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING id;`,
    [id, userId]
  );
  return res.rows.length > 0;
}

/**
 * Marca todas las notificaciones no leídas del usuario de una sola vez
 * (botón "Marcar todas como leídas" del dropdown) — devuelve cuántas
 * filas tocó, para que la UI pueda decidir si vale la pena refrescar.
 */
export async function markAllNotificationsRead(userId: number | string): Promise<number> {
  const res = await query(
    `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL RETURNING id;`,
    [userId]
  );
  return res.rows.length;
}
