import { query } from "../db";

interface QueryRunner {
  query: typeof query;
}

/**
 * Exportación completa de todo lo que la agencia tiene sobre un cliente —
 * derecho de portabilidad (Ley 1581/RGPD). Metadata de documentos, NUNCA
 * los archivos en sí (serían potencialmente pesados y ya son
 * descargables uno por uno desde `/dashboard/proyectos/[id]`) — el
 * export es "qué datos tenemos", no un respaldo binario completo.
 *
 * `null` si el cliente no existe. Un cliente ya anonimizado SÍ se puede
 * exportar (para que el propio ejercicio del derecho al olvido quede
 * documentable), simplemente sus campos ya vienen anonimizados.
 */
export async function exportClientData(clientId: number): Promise<Record<string, unknown> | null> {
  const clientRes = await query(
    `SELECT id, name, email, company, phone, notes, created_at, anonymized_at FROM clients WHERE id = $1;`,
    [clientId]
  );
  const client = clientRes.rows[0];
  if (!client) return null;

  const projectsRes = await query(
    `SELECT id, title, description, status, progress, repo_url, staging_url, created_at
     FROM projects WHERE client_id = $1 ORDER BY created_at ASC;`,
    [clientId]
  );
  const projectIds = projectsRes.rows.map((p) => p.id);

  const [sprintsRes, tasksRes, invoicesRes, documentsRes, ticketsRes, retainersRes, onboardingRes, proposalsRes, leadsRes] =
    await Promise.all([
      projectIds.length
        ? query(`SELECT id, project_id, title, status, progress FROM sprints WHERE project_id = ANY($1::int[]) ORDER BY id ASC;`, [projectIds])
        : Promise.resolve({ rows: [] }),
      projectIds.length
        ? query(
            `SELECT id, project_id, title, status, estimated_hours, due_date, created_at FROM tasks
             WHERE project_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY id ASC;`,
            [projectIds]
          )
        : Promise.resolve({ rows: [] }),
      projectIds.length
        ? query(
            `SELECT i.id, i.project_id, i.invoice_number, i.description, i.amount, i.currency, i.due_date, i.created_at
             FROM invoices i WHERE i.project_id = ANY($1::int[]) AND i.deleted_at IS NULL ORDER BY i.created_at ASC;`,
            [projectIds]
          )
        : Promise.resolve({ rows: [] }),
      projectIds.length
        ? query(
            `SELECT id, project_id, original_filename, mime_type, size_bytes, created_at FROM documents
             WHERE project_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY created_at ASC;`,
            [projectIds]
          )
        : Promise.resolve({ rows: [] }),
      projectIds.length
        ? query(
            `SELECT id, project_id, title, priority, status, sla_due_at, created_at FROM support_tickets
             WHERE project_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY created_at ASC;`,
            [projectIds]
          )
        : Promise.resolve({ rows: [] }),
      query(
        `SELECT id, project_id, description, amount, currency, billing_day, status, next_invoice_date::text AS next_invoice_date, created_at
         FROM retainers WHERE client_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC;`,
        [clientId]
      ),
      projectIds.length
        ? query(
            `SELECT id, project_id, title, responsible, completed_at FROM onboarding_items WHERE project_id = ANY($1::int[]) ORDER BY position ASC;`,
            [projectIds]
          )
        : Promise.resolve({ rows: [] }),
      query(
        `SELECT id, title, currency, tax_rate, valid_until, viewed_at, accepted_at, rejected_at, created_at
         FROM proposals WHERE lower(client_email) = lower($1) ORDER BY created_at ASC;`,
        [client.email]
      ),
      query(
        `SELECT id, name, service, budget, status, created_at FROM leads
         WHERE lower(email) = lower($1) AND deleted_at IS NULL ORDER BY created_at ASC;`,
        [client.email]
      ),
    ]);

  const invoiceIds = invoicesRes.rows.map((i) => i.id);
  const paymentsRes = invoiceIds.length
    ? await query(`SELECT id, invoice_id, amount, paid_at, method FROM payments WHERE invoice_id = ANY($1::int[]) ORDER BY paid_at ASC;`, [
        invoiceIds,
      ])
    : { rows: [] };

  return {
    exportedAt: new Date().toISOString(),
    client,
    projects: projectsRes.rows,
    sprints: sprintsRes.rows,
    tasks: tasksRes.rows,
    invoices: invoicesRes.rows,
    payments: paymentsRes.rows,
    documents: documentsRes.rows,
    supportTickets: ticketsRes.rows,
    retainers: retainersRes.rows,
    onboardingItems: onboardingRes.rows,
    proposals: proposalsRes.rows,
    leads: leadsRes.rows,
  };
}

export type AnonymizeClientResult = { outcome: "ok" } | { outcome: "not_found" } | { outcome: "already_anonymized" };

/**
 * Anonimiza un cliente: reemplaza los campos identificables por valores
 * genéricos, en vez de un DELETE físico — ver el comentario de la
 * migración 0029 sobre por qué (obligación contable/legal de conservar
 * proyectos, facturas y pagos). Tres pasos, todos dentro de la MISMA
 * transacción que le pasa el caller (`dbRunner`):
 *
 * 1. `clients` — nombre/email/empresa/teléfono/notas.
 * 2. `users` con `client_id` propio (login del portal) — mismo criterio,
 *    más `status = 'disabled'` y revocar sus sesiones activas: alguien
 *    que ejerció su derecho al olvido no debe poder seguir con sesión
 *    iniciada en el portal.
 * 3. `proposals` cuyo `client_email` (copia en el momento, no una FK)
 *    coincide con el email ORIGINAL del cliente — se captura antes de
 *    sobreescribir `clients.email` en el paso 1.
 *
 * Deliberadamente NO toca proyectos/facturas/pagos/documentos — esos
 * quedan con sus montos y fechas intactos, solo dejan de estar atados a
 * un nombre real.
 *
 * Sí anonimiza también los `leads` que coincidan por email (paso 4, ver
 * abajo): un cliente real casi siempre empezó como un lead del formulario
 * de contacto o el cotizador antes de convertirse — sin este paso, ese
 * lead original quedaba con nombre/teléfono/mensaje en texto plano después
 * de anonimizar al cliente, dejando el derecho al olvido incompleto (bug
 * real, corregido junto con la migración 0035). Mismo criterio que el
 * paso de `proposals`: coincide por el email ORIGINAL, capturado antes de
 * sobreescribirlo en el paso 1.
 */
export async function anonymizeClient(clientId: number, dbRunner: QueryRunner): Promise<AnonymizeClientResult> {
  const clientRes = await dbRunner.query(`SELECT email, anonymized_at FROM clients WHERE id = $1;`, [clientId]);
  const client = clientRes.rows[0];
  if (!client) return { outcome: "not_found" };
  if (client.anonymized_at) return { outcome: "already_anonymized" };

  const originalEmail: string = client.email;
  const anonName = `Cliente Eliminado #${clientId}`;
  const anonEmail = `cliente-eliminado-${clientId}@anonimizado.local`;

  await dbRunner.query(
    `UPDATE clients SET name = $1, email = $2, company = NULL, phone = NULL, notes = '', anonymized_at = now() WHERE id = $3;`,
    [anonName, anonEmail, clientId]
  );

  const usersRes = await dbRunner.query(`SELECT id FROM users WHERE client_id = $1 AND role = 'client';`, [clientId]);
  for (const userRow of usersRes.rows) {
    const userId = userRow.id;
    await dbRunner.query(
      `UPDATE users SET name = $1, email = $2, status = 'disabled' WHERE id = $3;`,
      [anonName, `usuario-eliminado-${userId}@anonimizado.local`, userId]
    );
    await dbRunner.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;`, [userId]);
  }

  await dbRunner.query(
    `UPDATE proposals SET client_name = $1, client_email = $2 WHERE lower(client_email) = lower($3);`,
    [anonName, anonEmail, originalEmail]
  );

  // Sin `notes` (ver el mismo comentario en anonymizeLead, lib/queries/leads.ts).
  await dbRunner.query(
    `UPDATE leads SET name = $1, email = $2, phone = NULL, message = '', anonymized_at = COALESCE(anonymized_at, now())
     WHERE lower(email) = lower($3) AND deleted_at IS NULL;`,
    [anonName, anonEmail, originalEmail]
  );

  return { outcome: "ok" };
}
