import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { getExpensesPage, createExpense } from "@/lib/queries/expenses";
import { CURRENCIES } from "@/lib/currency";
import { logError } from "@/lib/logger";

const EXPENSE_CATEGORIES = ["licencias", "infraestructura", "subcontratos", "otro"] as const;

const CreateExpenseSchema = z.object({
  project_id: z.number().int().positive().nullable(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.enum(CURRENCIES as [string, ...string[]]),
  expense_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
});

/**
 * GET /api/expenses - Listado paginado de gastos (licencias,
 * infraestructura, subcontratos, otros), con búsqueda y filtro por
 * categoría. Requiere `expenses:read` (solo admin).
 */
export const GET = withAuth("expenses:read", async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "ALL";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = 20;

    const result = await getExpensesPage({ q, category, page, pageSize });
    return NextResponse.json({ success: true, ...result, page, pageSize });
  } catch (error) {
    logError("❌ [API GET Expenses Error]", error);
    return NextResponse.json({ error: "Error al obtener gastos." }, { status: 500 });
  }
});

/**
 * POST /api/expenses - Registra un gasto, opcionalmente atribuido a un
 * proyecto (`project_id: null` = overhead general de la agencia). Requiere
 * `expenses:write` (solo admin).
 */
export const POST = withAuth("expenses:write", async (request, { session }) => {
  try {
    const parsed = CreateExpenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de gasto inválidos." }, { status: 400 });
    }
    const ip = getClientIp(request);

    const expenseId = await withTransaction(async (client) => {
      const id = await createExpense(parsed.data, session.id, client);
      if (id === null) return null;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "expense.create",
        entityType: "expense",
        entityId: id,
        diff: { after: parsed.data },
        ip,
      });

      return id;
    });

    if (expenseId === null) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: expenseId });
  } catch (error) {
    logError("❌ [API POST Expense Error]", error);
    return NextResponse.json({ error: "Error al crear el gasto." }, { status: 500 });
  }
});
