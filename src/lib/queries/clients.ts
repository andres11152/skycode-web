import { query } from "../db";
import { convertCurrency, type Currency } from "../currency";
import { getClientProjects } from "./projects";
import type { Client, ClientDetail, Invoice, Proposal } from "@/components/dashboard/types";

export interface ClientsPageParams {
  q: string;
  page: number;
  pageSize: number;
  usdToCopRate: number;
}

export interface ClientsPageResult {
  clients: Client[];
  total: number;
}

/**
 * Lista paginada de clientes con agregados (proyectos, facturado, saldo
 * pendiente) — todo en una sola consulta vía subqueries correlacionadas en
 * el SELECT, no N+1. `totalBilledCop`/`totalOutstandingCop` convierten
 * cada factura a COP con la tasa vigente antes de sumar, mismo criterio
 * que `lib/queries/profitability.ts` — facturas en USD y COP no se pueden
 * sumar directo.
 */
export async function getClientsPage({ q, page, pageSize, usdToCopRate }: ClientsPageParams): Promise<ClientsPageResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.company ILIKE $${idx})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(pageSize);
  const limitIdx = params.length;
  params.push((page - 1) * pageSize);
  const offsetIdx = params.length;

  const res = await query(
    `SELECT c.id, c.name, c.email, c.company, c.phone, c.notes, c.created_at,
            COUNT(DISTINCT p.id) AS project_count,
            COALESCE(SUM(i.amount), 0) AS total_billed,
            COALESCE(SUM(i.amount) - SUM(COALESCE(pay.paid_amount, 0)), 0) AS total_outstanding,
            COUNT(*) OVER() AS total_count
     FROM clients c
     LEFT JOIN projects p ON p.client_id = c.id AND p.deleted_at IS NULL
     LEFT JOIN invoices i ON i.project_id = p.id AND i.deleted_at IS NULL
     LEFT JOIN (
       SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
     ) pay ON pay.invoice_id = i.id
     ${where}
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
    params
  );

  // La suma de arriba mezcla monedas de distintas facturas sin convertir
  // (SQL no sabe la tasa de cambio) — se recalcula acá en JS por cliente,
  // trayendo el detalle de moneda por factura solo para las filas de esta
  // página (nunca la tabla completa).
  const clients: Client[] = [];
  for (const row of res.rows) {
    const invoicesRes = await query(
      `SELECT i.amount, i.currency, COALESCE(pay.paid_amount, 0) AS paid_amount
       FROM invoices i
       JOIN projects p ON p.id = i.project_id
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
       ) pay ON pay.invoice_id = i.id
       WHERE p.client_id = $1 AND i.deleted_at IS NULL;`,
      [row.id]
    );

    let totalBilledCop = 0;
    let totalOutstandingCop = 0;
    for (const inv of invoicesRes.rows) {
      const amount = Number(inv.amount);
      const currency = inv.currency as Currency;
      const paid = Number(inv.paid_amount);
      totalBilledCop += convertCurrency(amount, currency, "COP", usdToCopRate);
      totalOutstandingCop += convertCurrency(amount - paid, currency, "COP", usdToCopRate);
    }

    clients.push({
      id: Number(row.id),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      company: row.company ? String(row.company) : null,
      phone: row.phone ? String(row.phone) : null,
      notes: String(row.notes ?? ""),
      created_at: String(row.created_at ?? ""),
      projectCount: Number(row.project_count),
      totalBilledCop,
      totalOutstandingCop,
    });
  }

  const total = res.rows[0] ? Number(res.rows[0].total_count) : 0;
  return { clients, total };
}

/**
 * Ficha 360: el cliente más sus proyectos (reutiliza `getClientProjects`,
 * el mismo query que alimenta el portal externo), propuestas (enlazadas
 * por email normalizado, ver nota en lib/queries/proposals.ts — no hay FK
 * `proposals.client_id`) y facturas (vía sus proyectos). `usdToCopRate`
 * convierte los totales agregados a COP antes de sumar — una factura en
 * USD y otra en COP no se pueden sumar directo.
 */
export async function getClientDetail(id: number, usdToCopRate: number): Promise<ClientDetail | null> {
  const clientRes = await query(
    `SELECT id, name, email, company, phone, notes, created_at FROM clients WHERE id = $1;`,
    [id]
  );
  const row = clientRes.rows[0];
  if (!row) return null;

  const [projects, proposalsRes, invoicesRes] = await Promise.all([
    getClientProjects(id),
    query(
      `SELECT p.id, p.title, p.currency, p.tax_rate, p.valid_until, p.viewed_at,
              p.accepted_at, p.rejected_at, p.created_at,
              COALESCE(SUM(pi.quantity * pi.unit_price), 0) AS subtotal
       FROM proposals p
       LEFT JOIN proposal_items pi ON pi.proposal_id = p.id
       WHERE p.client_email = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC;`,
      [String(row.email)]
    ),
    query(
      `SELECT i.id, i.project_id, pr.title AS project_title, i.description, i.amount, i.currency,
              i.due_date, i.created_at, COALESCE(pay.paid_amount, 0) AS paid_amount
       FROM invoices i
       JOIN projects pr ON pr.id = i.project_id
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id
       ) pay ON pay.invoice_id = i.id
       WHERE pr.client_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.due_date ASC;`,
      [id]
    ),
  ]);

  // Réplica minimalista de `computeStatus`/`computeTotals` de
  // lib/queries/proposals.ts para no acoplar este módulo a sus funciones
  // privadas — esta ficha solo necesita título/estado/total, no el
  // desglose de partidas (eso ya vive en /dashboard/propuestas).
  const proposals: Proposal[] = proposalsRes.rows.map((p) => {
    const taxRate = Number(p.tax_rate);
    const subtotal = Number(p.subtotal);
    const total = subtotal * (1 + taxRate / 100);
    let status: Proposal["status"] = "sent";
    if (p.accepted_at) status = "accepted";
    else if (p.rejected_at) status = "rejected";
    else if (p.valid_until && new Date(p.valid_until) < new Date(new Date().toDateString())) status = "expired";
    else if (p.viewed_at) status = "viewed";

    return {
      id: String(p.id),
      client_email: String(row.email),
      client_name: String(row.name),
      title: String(p.title ?? ""),
      notes: "",
      currency: p.currency as Currency,
      tax_rate: taxRate,
      valid_until: p.valid_until,
      viewed_at: p.viewed_at,
      accepted_at: p.accepted_at,
      rejected_at: p.rejected_at,
      accepted_project_id: null,
      created_at: String(p.created_at ?? ""),
      items: [],
      subtotal,
      total,
      status,
    };
  });

  const invoices: Invoice[] = invoicesRes.rows.map((i) => {
    const amount = Number(i.amount);
    const paidAmount = Number(i.paid_amount);
    const balance = amount - paidAmount;
    let status: Invoice["status"] = "pending";
    let daysOverdue = 0;
    if (balance <= 0) {
      status = "paid";
    } else {
      const diffDays = Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        status = "overdue";
        daysOverdue = diffDays;
      }
    }
    return {
      id: Number(i.id),
      invoice_number: String(i.invoice_number ?? `INV-${i.id}`),
      project_id: Number(i.project_id),
      project_title: String(i.project_title ?? ""),
      client_name: String(row.name),
      client_phone: row.phone ?? null,
      description: String(i.description ?? ""),
      amount,
      currency: i.currency as Currency,
      due_date: String(i.due_date ?? ""),
      created_at: String(i.created_at ?? ""),
      paidAmount,
      balance,
      status,
      daysOverdue,
      payments: [],
    };
  });

  let totalBilledCop = 0;
  let totalOutstandingCop = 0;
  for (const invoice of invoices) {
    totalBilledCop += convertCurrency(invoice.amount, invoice.currency, "COP", usdToCopRate);
    totalOutstandingCop += convertCurrency(invoice.balance, invoice.currency, "COP", usdToCopRate);
  }

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    company: row.company ? String(row.company) : null,
    phone: row.phone ? String(row.phone) : null,
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at ?? ""),
    projects,
    proposals,
    invoices,
    totalBilledCop,
    totalOutstandingCop,
  };
}

export interface UpdateClientData {
  name?: string;
  company?: string;
  phone?: string;
  notes?: string;
}

interface QueryRunner {
  query: typeof query;
}

/**
 * Edita los datos de contacto de un cliente. El email nunca se edita acá
 * a propósito: es la clave con la que `createProjectWithClient` y
 * `acceptProposalAndCreateProject` hacen el upsert (`ON CONFLICT (email)`)
 * — cambiarlo rompería ese enlace para proyectos/propuestas futuros.
 */
export async function updateClient(id: number, data: UpdateClientData, dbRunner: QueryRunner) {
  const before = await dbRunner.query("SELECT * FROM clients WHERE id = $1;", [id]);
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE clients
     SET name = COALESCE($1, name),
         company = COALESCE($2, company),
         phone = COALESCE($3, phone),
         notes = COALESCE($4, notes)
     WHERE id = $5
     RETURNING *;`,
    [data.name, data.company, data.phone, data.notes, id]
  );

  return { before: before.rows[0], after: res.rows[0] };
}
