import { beforeEach, describe, expect, it } from "vitest";
import { getExpensesPage, getExpensesByProjectCop, createExpense, softDeleteExpense } from "./expenses";
import { query, withTransaction } from "../db";
import { createTestClient, createTestExpense, createTestProject, createTestUser, resetTestDb } from "../testHelpers/db";

const RATE = 4000;

beforeEach(async () => {
  await resetTestDb();
});

describe("getExpensesPage", () => {
  it("lista gastos con quién los creó y el proyecto (si tiene)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { title: "Proyecto X" });
    const user = await createTestUser({ name: "Admin Uno" });

    await withTransaction((c) =>
      createExpense(
        { project_id: project.id, category: "licencias", description: "Figma anual", amount: 100, currency: "USD", expense_date: "2026-01-15" },
        user.id,
        c
      )
    );

    const { expenses, total } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 20 });
    expect(total).toBe(1);
    expect(expenses[0].description).toBe("Figma anual");
    expect(expenses[0].project_title).toBe("Proyecto X");
    expect(expenses[0].created_by).toEqual({ id: user.id, name: "Admin Uno", email: user.email });
  });

  it("un gasto sin proyecto (overhead) lista project_id/project_title como null", async () => {
    const user = await createTestUser();
    await withTransaction((c) =>
      createExpense(
        { project_id: null, category: "infraestructura", description: "Servidor compartido", amount: 50000, currency: "COP", expense_date: "2026-01-01" },
        user.id,
        c
      )
    );

    const { expenses } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 20 });
    expect(expenses[0].project_id).toBeNull();
    expect(expenses[0].project_title).toBeNull();
  });

  it("filtra por búsqueda libre sobre descripción o proyecto", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { title: "Sentry CRM" });
    await createTestExpense({ projectId: project.id, description: "Licencia Figma" });
    await createTestExpense({ projectId: project.id, description: "Contrato freelancer" });

    const { expenses } = await getExpensesPage({ q: "figma", category: "ALL", page: 1, pageSize: 20 });
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe("Licencia Figma");
  });

  it("filtra por categoría", async () => {
    await createTestExpense({ category: "licencias", description: "A" });
    await createTestExpense({ category: "subcontratos", description: "B" });

    const { expenses } = await getExpensesPage({ q: "", category: "subcontratos", page: 1, pageSize: 20 });
    expect(expenses.map((e) => e.description)).toEqual(["B"]);
  });

  it("excluye gastos borrados lógicamente", async () => {
    await createTestExpense({ description: "Visible" });
    const deleted = await createTestExpense({ description: "Borrado" });
    await query(`UPDATE expenses SET deleted_at = now() WHERE id = $1;`, [deleted.id]);

    const { expenses, total } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 20 });
    expect(total).toBe(1);
    expect(expenses.map((e) => e.description)).toEqual(["Visible"]);
  });

  it("pagina en SQL, más recientes primero", async () => {
    await createTestExpense({ description: "Viejo", expenseDate: "2026-01-01" });
    await createTestExpense({ description: "Reciente", expenseDate: "2026-02-01" });

    const { expenses, total } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 1 });
    expect(total).toBe(2);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe("Reciente");
  });

  it("totalThisMonthCop suma todos los gastos del mes en curso (no solo la página visible), convertidos a COP", async () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-05`;
    await createTestExpense({ amount: 100000, currency: "COP", expenseDate: thisMonth });
    await createTestExpense({ amount: 25, currency: "USD", expenseDate: thisMonth }); // requiere tasa real, no fija
    await createTestExpense({ amount: 999999, currency: "COP", expenseDate: "2020-01-01" }); // fuera del mes

    const { totalThisMonthCop } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 20 });
    expect(totalThisMonthCop).toBeGreaterThanOrEqual(100000);
    expect(totalThisMonthCop).toBeLessThan(999999);
  });
});

describe("getExpensesByProjectCop", () => {
  it("agrega solo gastos con project_id propio, convertidos a COP, ignora overhead sin proyecto", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestExpense({ projectId: project.id, amount: 50, currency: "USD" });
    await createTestExpense({ projectId: project.id, amount: 10000, currency: "COP" });
    await createTestExpense({ projectId: null, amount: 999999, currency: "COP" });

    const byProject = await getExpensesByProjectCop(RATE);
    expect(byProject.get(project.id)).toBeCloseTo(50 * RATE + 10000, 5);
  });

  it("un proyecto sin gastos no aparece en el mapa", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const byProject = await getExpensesByProjectCop(RATE);
    expect(byProject.has(project.id)).toBe(false);
  });
});

describe("softDeleteExpense", () => {
  it("borra lógicamente y ya no aparece en getExpensesPage ni en getExpensesByProjectCop", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const expense = await createTestExpense({ projectId: project.id, amount: 5000 });

    const deleted = await withTransaction((c) => softDeleteExpense(expense.id, c));
    expect(deleted).toBe(true);

    const { total } = await getExpensesPage({ q: "", category: "ALL", page: 1, pageSize: 20 });
    expect(total).toBe(0);
    const byProject = await getExpensesByProjectCop(RATE);
    expect(byProject.has(project.id)).toBe(false);
  });

  it("devuelve false si ya estaba borrado o no existe", async () => {
    const result = await withTransaction((c) => softDeleteExpense(999999, c));
    expect(result).toBe(false);
  });
});
