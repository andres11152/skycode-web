import { query } from "../db";
import { sendEmail } from "../email";

export interface WeeklyDigestStats {
  newLeads: number;
  pendingProposals: number;
  overdueInvoices: number;
  slaAtRisk: number;
}

// Ventana de "en riesgo" para el resumen semanal — deliberadamente más
// amplia que las 2h de `SLA_WARNING_WINDOW_HOURS` en notifications.ts: ese
// umbral es para un aviso urgente e inmediato, este es un vistazo de
// planeación de la semana, así que también cuenta lo que vence en los
// próximos 2 días, no solo lo inminente.
const SLA_AT_RISK_WINDOW_HOURS = 48;

/**
 * Cuatro conteos livianos (no las filas completas — este resumen es un
 * vistazo de números, no un reporte detallado, para eso ya existen los
 * tableros de cada módulo) para el correo semanal al equipo comercial.
 * Deliberadamente NO suma montos de facturas vencidas: mezclarían COP y
 * USD sin convertir (ver el cuidado que toma `profitability.ts` con esto)
 * — un conteo simple evita ese problema sin necesitar la tasa de cambio
 * acá.
 */
export async function getWeeklyDigestStats(): Promise<WeeklyDigestStats> {
  const [leadsRes, proposalsRes, invoicesRes, slaRes] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM leads WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days';`),
    query(
      `SELECT COUNT(*) AS count FROM proposals
       WHERE accepted_at IS NULL AND rejected_at IS NULL
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);`
    ),
    query(
      `WITH balances AS (
         SELECT i.id, (i.amount - COALESCE(SUM(p.amount), 0)) AS balance
         FROM invoices i
         LEFT JOIN payments p ON p.invoice_id = i.id
         WHERE i.deleted_at IS NULL AND i.due_date < CURRENT_DATE
         GROUP BY i.id
       )
       SELECT COUNT(*) AS count FROM balances WHERE balance > 0;`
    ),
    query(
      `SELECT COUNT(*) AS count FROM support_tickets
       WHERE deleted_at IS NULL AND status NOT IN ('Resuelto', 'Cerrado')
         AND sla_due_at <= now() + ($1 || ' hours')::interval;`,
      [SLA_AT_RISK_WINDOW_HOURS]
    ),
  ]);

  return {
    newLeads: Number(leadsRes.rows[0].count),
    pendingProposals: Number(proposalsRes.rows[0].count),
    overdueInvoices: Number(invoicesRes.rows[0].count),
    slaAtRisk: Number(slaRes.rows[0].count),
  };
}

/**
 * Destinatarios del resumen — `admin`/`sales_manager` porque son los dos
 * roles con visibilidad real sobre leads/propuestas/facturación en RBAC
 * (ver lib/rbac.ts); `traffiker` no tiene esos permisos y no debería
 * recibir un resumen con datos que no puede ver en el dashboard.
 */
async function getDigestRecipients(): Promise<string[]> {
  const res = await query(
    `SELECT email FROM users WHERE status = 'active' AND role IN ('admin', 'sales_manager');`
  );
  return res.rows.map((row) => String(row.email));
}

function buildDigestEmailText(stats: WeeklyDigestStats): string {
  return [
    `Resumen semanal de SkyCode Agency:`,
    ``,
    `- Leads nuevos esta semana: ${stats.newLeads}`,
    `- Propuestas pendientes de respuesta: ${stats.pendingProposals}`,
    `- Facturas vencidas: ${stats.overdueInvoices}`,
    `- Tickets con SLA en riesgo (próximas 48h o ya vencido): ${stats.slaAtRisk}`,
    ``,
    `Revisa el detalle en /dashboard/leads, /dashboard/propuestas, /dashboard/facturacion y /dashboard/soporte.`,
  ].join("\n");
}

/**
 * Envía el resumen a cada destinatario activo — de mejor esfuerzo, igual
 * que los `notify*()` de notifications.ts: si el envío a una persona
 * falla, no bloquea el de las demás. Devuelve cuántos correos se
 * intentaron enviar, para que la ruta del cron lo reporte.
 */
export async function sendWeeklyDigest(): Promise<number> {
  const stats = await getWeeklyDigestStats();
  const recipients = await getDigestRecipients();
  const text = buildDigestEmailText(stats);

  for (const email of recipients) {
    await sendEmail({ to: email, subject: "Resumen semanal — SkyCode Agency", text });
  }

  return recipients.length;
}
