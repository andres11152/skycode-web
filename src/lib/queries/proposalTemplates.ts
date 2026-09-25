import { query } from "../db";
import type { Currency } from "../currency";
import type { ProposalTemplate, ProposalTemplateItem } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  const res = await query(
    `SELECT id, name, currency, tax_rate, items, created_at
     FROM proposal_templates
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC;`
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    currency: row.currency as Currency,
    tax_rate: Number(row.tax_rate),
    items: row.items as ProposalTemplateItem[],
    created_at: String(row.created_at),
  }));
}

export async function createProposalTemplate(
  data: { name: string; currency?: string; tax_rate?: number; items: ProposalTemplateItem[] },
  createdBy: number | string
): Promise<number> {
  const res = await query(
    `INSERT INTO proposal_templates (name, currency, tax_rate, items, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id;`,
    [data.name, data.currency || "COP", data.tax_rate ?? 0, JSON.stringify(data.items), createdBy]
  );
  return Number(res.rows[0].id);
}

/**
 * Soft-delete, mismo criterio que el resto de tablas del proyecto —
 * devuelve `false` sin tocar nada si el id no existe o ya estaba borrado,
 * para que la ruta responda 404 en vez de un 200 sin efecto.
 */
export async function deleteProposalTemplate(id: number, dbRunner: QueryRunner): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE proposal_templates SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id;`,
    [id]
  );
  return res.rows.length > 0;
}
