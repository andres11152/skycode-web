import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireSession } from "@/lib/withAuth";
import { hasPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { softDeleteExpense } from "@/lib/queries/expenses";
import { logError } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseExpenseId(id: string): number | null {
  const expenseId = Number(id);
  return Number.isInteger(expenseId) && expenseId > 0 ? expenseId : null;
}

/**
 * DELETE /api/expenses/[id] - Borrado lógico de un gasto. Requiere
 * `expenses:write` (solo admin).
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;

  if (!hasPermission(session.role, "expenses:write")) {
    return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
  }

  const expenseId = parseExpenseId((await params).id);
  if (expenseId === null) {
    return NextResponse.json({ error: "ID de gasto inválido." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);

    const deleted = await withTransaction(async (client) => {
      const result = await softDeleteExpense(expenseId, client);
      if (!result) return false;

      await logAudit(client.query.bind(client), {
        actorId: session.id,
        actorEmail: session.email,
        action: "expense.delete",
        entityType: "expense",
        entityId: expenseId,
        ip,
      });

      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Gasto no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("❌ [API DELETE Expense Error]", error);
    return NextResponse.json({ error: "Error al eliminar el gasto." }, { status: 500 });
  }
}
