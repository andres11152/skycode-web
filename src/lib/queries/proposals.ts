import { query } from "../db";
import type { Currency } from "../currency";
import { createOnboardingChecklist } from "./onboarding";
import type { Proposal, ProposalItem } from "@/components/dashboard/types";

interface ProposalRow {
  id: string;
  client_email: string;
  client_name: string;
  title: string;
  notes: string;
  currency: string;
  tax_rate: string | number;
  valid_until: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  accepted_project_id: number | null;
  created_at: string;
}

function computeStatus(row: ProposalRow): Proposal["status"] {
  if (row.accepted_at) return "accepted";
  if (row.rejected_at) return "rejected";
  if (row.valid_until && new Date(row.valid_until) < new Date(new Date().toDateString())) return "expired";
  if (row.viewed_at) return "viewed";
  return "sent";
}

function computeTotals(items: ProposalItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return { subtotal, total: subtotal * (1 + taxRate / 100) };
}

async function getProposalItems(proposalId: string): Promise<ProposalItem[]> {
  const res = await query(
    `SELECT id, description, quantity, unit_price FROM proposal_items WHERE proposal_id = $1 ORDER BY sort_order ASC;`,
    [proposalId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    description: r.description,
    quantity: r.quantity,
    unit_price: Number(r.unit_price),
  }));
}

function shapeProposal(row: ProposalRow, items: ProposalItem[]): Proposal {
  const taxRate = Number(row.tax_rate);
  const { subtotal, total } = computeTotals(items, taxRate);
  return {
    id: row.id,
    client_email: row.client_email,
    client_name: row.client_name,
    title: row.title,
    notes: row.notes,
    currency: row.currency as Currency,
    tax_rate: taxRate,
    valid_until: row.valid_until,
    viewed_at: row.viewed_at,
    accepted_at: row.accepted_at,
    rejected_at: row.rejected_at,
    accepted_project_id: row.accepted_project_id,
    created_at: row.created_at,
    items,
    subtotal,
    total,
    status: computeStatus(row),
  };
}

function mapRowToProposalRow(row: Record<string, unknown>): ProposalRow {
  return {
    id: String(row.id ?? ""),
    client_email: String(row.client_email ?? ""),
    client_name: String(row.client_name ?? ""),
    title: String(row.title ?? ""),
    notes: String(row.notes ?? ""),
    currency: String(row.currency ?? "COP"),
    tax_rate: Number(row.tax_rate ?? 0),
    valid_until: row.valid_until ? String(row.valid_until) : null,
    viewed_at: row.viewed_at ? String(row.viewed_at) : null,
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    rejected_at: row.rejected_at ? String(row.rejected_at) : null,
    accepted_project_id: row.accepted_project_id ? Number(row.accepted_project_id) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function getAllProposals(): Promise<Proposal[]> {
  const res = await query(`SELECT * FROM proposals ORDER BY created_at DESC;`);
  const proposals: Proposal[] = [];
  for (const rawRow of res.rows) {
    const row = mapRowToProposalRow(rawRow);
    proposals.push(shapeProposal(row, await getProposalItems(row.id)));
  }
  return proposals;
}

/** Público — se accede por posesión del UUID del enlace, no por sesión. */
export async function getProposalById(id: string): Promise<Proposal | null> {
  const res = await query(`SELECT * FROM proposals WHERE id = $1;`, [id]);
  const rawRow = res.rows[0];
  if (!rawRow) return null;
  const row = mapRowToProposalRow(rawRow);
  return shapeProposal(row, await getProposalItems(id));
}

export async function markProposalViewed(id: string, dbRunner?: QueryRunner) {
  const executor = dbRunner ?? { query };
  await executor.query(`UPDATE proposals SET viewed_at = now() WHERE id = $1 AND viewed_at IS NULL;`, [id]);
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateProposalItemData {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateProposalData {
  id: string;
  client_email: string;
  client_name: string;
  title: string;
  notes?: string;
  currency?: string;
  tax_rate?: number;
  valid_until?: string;
  items: CreateProposalItemData[];
}

/**
 * Inserta una propuesta con sus partidas.
 */
export async function createProposal(data: CreateProposalData, userId: number | string, dbRunner: QueryRunner) {
  await dbRunner.query(
    `INSERT INTO proposals (id, client_email, client_name, title, notes, currency, tax_rate, valid_until, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
    [
      data.id,
      data.client_email.toLowerCase(),
      data.client_name,
      data.title,
      data.notes || "",
      data.currency || "COP",
      data.tax_rate ?? 0,
      data.valid_until || null,
      userId,
    ]
  );

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    await dbRunner.query(
      `INSERT INTO proposal_items (proposal_id, description, quantity, unit_price, sort_order) VALUES ($1, $2, $3, $4, $5);`,
      [data.id, item.description, item.quantity, item.unit_price, i]
    );
  }
}

/**
 * Marca una propuesta como rechazada.
 */
export async function rejectProposal(id: string, dbRunner: QueryRunner) {
  await dbRunner.query(`UPDATE proposals SET rejected_at = now() WHERE id = $1;`, [id]);
}

/**
 * Acepta una propuesta, creando/enlazando el cliente y creando el proyecto con sus sprints.
 */
export async function acceptProposalAndCreateProject(proposal: Proposal, dbRunner: QueryRunner) {
  const clientEmailNormalized = proposal.client_email.toLowerCase();
  const insertClientRes = await dbRunner.query(
    `INSERT INTO clients (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id;`,
    [proposal.client_name, clientEmailNormalized]
  );
  const clientId =
    insertClientRes.rows[0]?.id ??
    (await dbRunner.query(`SELECT id FROM clients WHERE email = $1;`, [clientEmailNormalized])).rows[0].id;

  const projectRes = await dbRunner.query(
    `INSERT INTO projects (client_id, title, description, progress, status)
     VALUES ($1, $2, $3, 0, 'Planificación')
     RETURNING *;`,
    [clientId, proposal.title, proposal.notes || ""]
  );
  const newProject = projectRes.rows[0];

  await createOnboardingChecklist(newProject.id, dbRunner);

  for (const item of proposal.items) {
    await dbRunner.query(
      `INSERT INTO sprints (project_id, title, status, progress) VALUES ($1, $2, 'Pendiente', 0);`,
      [newProject.id, `${item.description} (x${item.quantity})`]
    );
  }

  await dbRunner.query(
    `UPDATE proposals SET accepted_at = now(), accepted_project_id = $1 WHERE id = $2;`,
    [newProject.id, proposal.id]
  );

  return newProject;
}

