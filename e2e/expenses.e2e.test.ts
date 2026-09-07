import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestClient, createTestExpense, createTestProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

function expensePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    project_id: null,
    category: "otro",
    description: "Gasto de prueba",
    amount: 1000,
    currency: "COP",
    expense_date: "2026-01-15",
    ...overrides,
  };
}

describe("Gastos — RBAC, creación y borrado de extremo a extremo", () => {
  it("admin (expenses:write) crea un gasto general (sin proyecto) y lo ve listado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/expenses", expensePayload({ description: "Licencia Figma" }));
    expect(createRes.status).toBe(200);

    const listRes = await adminClient.get("/api/expenses");
    expect(listRes.status).toBe(200);
    const { expenses } = await listRes.json();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe("Licencia Figma");
    expect(expenses[0].project_id).toBeNull();
  });

  it("admin crea un gasto atribuido a un proyecto real", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/expenses", expensePayload({ project_id: project.id, description: "Subcontrato QA" }));
    expect(res.status).toBe(200);

    const { expenses } = await (await adminClient.get("/api/expenses")).json();
    expect(expenses[0].project_id).toBe(project.id);
  });

  it("un project_id que no existe da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/expenses", expensePayload({ project_id: 999999 }));
    expect(res.status).toBe(404);
  });

  it("sales_manager NO tiene acceso a gastos (a diferencia de clientes/tareas/soporte/documentos)", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");

    expect((await salesClient.get("/api/expenses")).status).toBe(403);
    expect((await salesClient.post("/api/expenses", expensePayload())).status).toBe(403);
  });

  it("traffiker NO tiene acceso a gastos", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");

    expect((await traffikerClient.get("/api/expenses")).status).toBe(403);
  });

  it("rechaza una categoría fuera del catálogo fijo", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/expenses", expensePayload({ category: "consultoria" }));
    expect(res.status).toBe(400);
  });

  it("admin elimina un gasto (borrado lógico) y ya no aparece listado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const createRes = await adminClient.post("/api/expenses", expensePayload());
    const { id } = await createRes.json();

    const deleteRes = await adminClient.delete(`/api/expenses/${id}`);
    expect(deleteRes.status).toBe(200);

    const { expenses, total } = await (await adminClient.get("/api/expenses")).json();
    expect(total).toBe(0);
    expect(expenses).toHaveLength(0);
  });

  it("un gasto inexistente da 404 al borrarlo", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    expect((await adminClient.delete("/api/expenses/999999")).status).toBe(404);
  });

  it("filtra por búsqueda y categoría vía query params", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    await createTestExpense({ description: "Licencia Figma", category: "licencias" });
    await createTestExpense({ description: "Contrato freelancer", category: "subcontratos" });

    const byQ = await (await adminClient.get("/api/expenses?q=figma")).json();
    expect(byQ.expenses).toHaveLength(1);

    const byCategory = await (await adminClient.get("/api/expenses?category=subcontratos")).json();
    expect(byCategory.expenses).toHaveLength(1);
    expect(byCategory.expenses[0].description).toBe("Contrato freelancer");
  });

  it("un cliente de portal no tiene acceso a gastos", async () => {
    const client = await createTestClient();
    const clientUser = await createTestUser({ role: "client", clientId: client.id, password: "SuperSecret123456" });
    const clientBrowser = await loginAs(clientUser.email, "SuperSecret123456");

    expect((await clientBrowser.get("/api/expenses")).status).toBe(403);
  });
});
