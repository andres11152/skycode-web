import { query } from "../db";
import { getUsdToCopRate } from "../exchangeRate";
import { convertCurrency } from "../currency";
import type { Expense, ExpenseCategory } from "@/components/dashboard/types";

const EXPENSES_SELECT = `
  SELECT e.id, e.project_id, p.title AS project_title, e.category, e.description,
         e.amount, e.currency, e.expense_date, e.created_at,
         u.id AS creator_id, u.name AS creator_name, u.email AS creator_email
  FROM expenses e
  LEFT JOIN projects p ON p.id = e.project_id
  LEFT JOIN users u ON u.id = e.created_by
`;

function shapeExpenseRow(row: Record<string, unknown>): Expense {
  const creatorId = row.creator_id ? Number(row.creator_id) : null;
  const creatorName = typeof row.creator_name === "string" ? row.creator_name : null;
  const creatorEmail = typeof row.creator_email === "string" ? row.creator_email : null;

  return {
    id: Number(row.id),
    project_id: row.project_id ? Number(row.project_id) : null,
    project_title: typeof row.project_title === "string" ? row.project_title : null,
    category: row.category as ExpenseCategory,
    description: String(row.description ?? ""),
    amount: Number(row.amount),
    currency: row.currency as Expense["currency"],
    expense_date: String(row.expense_date ?? ""),
    created_by: creatorId && creatorName && creatorEmail ? { id: creatorId, name: creatorName, email: creatorEmail } : null,
    created_at: String(row.created_at ?? ""),
  };
}

export interface ExpensesPageParams {
  q: string;
  category: string; // "ALL" o un valor de ExpenseCategory
  page: number;
  pageSize: number;
}

export interface ExpensesPageResult {
  expenses: Expense[];
  total: number;
  totalThisMonthCop: number;
}

/**
 * Página de gastos para /dashboard/gastos: búsqueda libre sobre
 * descripción/proyecto, filtro por categoría, paginada en SQL — mismo
 * patrón que `getAuditLogPage`. `totalThisMonthCop` se calcula sobre TODO
 * el mes (no solo la página visible), convertido a COP con la tasa
 * vigente, para que el resumen no dependa de cuántas filas trajo esta página.
 */
export async function getExpensesPage({ q, category, page, pageSize }: ExpensesPageParams): Promise<ExpensesPageResult> {
  const usdToCopRate = await getUsdToCopRate();
  const conditions: string[] = ["e.deleted_at IS NULL"];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(e.description ILIKE $${idx} OR p.title ILIKE $${idx})`);
  }
  if (category !== "ALL") {
    params.push(category);
    conditions.push(`e.category = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  params.push(pageSize);
  const limitIdx = params.length;
  params.push((page - 1) * pageSize);
  const offsetIdx = params.length;

  const countParams = params.slice(0, params.length - 2);

  const [expensesRes, countRes, monthRowsRes] = await Promise.all([
    query(
      `${EXPENSES_SELECT} ${where}
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM expenses e LEFT JOIN projects p ON p.id = e.project_id ${where};`, countParams),
    query(
      `SELECT amount, currency FROM expenses
       WHERE deleted_at IS NULL AND date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE);`
    ),
  ]);

  const totalThisMonthCop = monthRowsRes.rows.reduce(
    (sum, r) => sum + convertCurrency(Number(r.amount), r.currency, "COP", usdToCopRate),
    0
  );

  return {
    expenses: expensesRes.rows.map(shapeExpenseRow),
    total: Number(countRes.rows[0]?.total ?? 0),
    totalThisMonthCop,
  };
}

interface QueryRunner {
  query: typeof query;
}

export interface CreateExpenseData {
  project_id: number | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
}

/** Devuelve `null` si `project_id` no es `null` pero no referencia un proyecto real (no borrado). */
export async function createExpense(data: CreateExpenseData, userId: number | string, dbRunner: QueryRunner): Promise<number | null> {
  if (data.project_id !== null) {
    const projectExists = await dbRunner.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL;", [
      data.project_id,
    ]);
    if (projectExists.rows.length === 0) return null;
  }

  const res = await dbRunner.query(
    `INSERT INTO expenses (project_id, category, description, amount, currency, expense_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id;`,
    [data.project_id, data.category, data.description, data.amount, data.currency, data.expense_date, userId]
  );
  return res.rows[0].id as number;
}

export async function softDeleteExpense(id: number, dbRunner: QueryRunner): Promise<boolean> {
  const res = await dbRunner.query(`UPDATE expenses SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id;`, [id]);
  return res.rows.length > 0;
}

/**
 * Suma de gastos con `project_id` propio, convertidos a COP — usado por
 * `getProjectProfitability` para cerrar el margen real. Gastos sin
 * proyecto (overhead general) quedan fuera a propósito: no son atribuibles
 * a un proyecto específico, así que no deben restar su margen individual.
 */
export async function getExpensesByProjectCop(usdToCopRate: number): Promise<Map<number, number>> {
  const res = await query(
    `SELECT project_id, amount, currency FROM expenses
     WHERE deleted_at IS NULL AND project_id IS NOT NULL;`
  );
  const byProject = new Map<number, number>();
  for (const row of res.rows) {
    const projectId = Number(row.project_id);
    const cop = convertCurrency(Number(row.amount), row.currency, "COP", usdToCopRate);
    byProject.set(projectId, (byProject.get(projectId) ?? 0) + cop);
  }
  return byProject;
}
