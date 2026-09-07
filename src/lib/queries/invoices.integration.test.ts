import { beforeEach, describe, expect, it } from "vitest";
import { getAllInvoices, getClientInvoices, createInvoice } from "./invoices";
import { withTransaction, query } from "../db";
import {
  createTestClient,
  createTestInvoice,
  createTestPayment,
  createTestProject,
  createTestUser,
  resetTestDb,
} from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

// Fecha LOCAL, no UTC — ver el mismo comentario en proposals.integration.test.ts:
// `toISOString()` puede desalinearse un día según la hora/zona horaria.
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("getAllInvoices — estado y saldo", () => {
  it("sin pagos y con vencimiento futuro: status = pending, balance = amount", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(10) });

    const [invoice] = await getAllInvoices();
    expect(invoice.status).toBe("pending");
    expect(invoice.balance).toBe(1000);
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.daysOverdue).toBe(0);
  });

  it("con pagos que cubren el total: status = paid, sin importar la fecha de vencimiento", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(-5) });
    await createTestPayment(invoice.id, { amount: 1000 });

    const [result] = await getAllInvoices();
    expect(result.status).toBe("paid");
    expect(result.balance).toBe(0);
  });

  it("con pagos parciales que exceden el total (sobrepago): balance queda negativo pero sigue paid", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(10) });
    await createTestPayment(invoice.id, { amount: 1200 });

    const [result] = await getAllInvoices();
    expect(result.status).toBe("paid");
    expect(result.balance).toBe(-200);
  });

  it("saldo pendiente y fecha de vencimiento pasada: status = overdue con días de mora > 0", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(-3) });

    const [result] = await getAllInvoices();
    expect(result.status).toBe("overdue");
    expect(result.daysOverdue).toBeGreaterThanOrEqual(2);
    expect(result.daysOverdue).toBeLessThanOrEqual(4);
  });

  it("pago parcial: balance refleja lo que falta, y sigue pending si no ha vencido", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(10) });
    await createTestPayment(invoice.id, { amount: 400 });

    const [result] = await getAllInvoices();
    expect(result.status).toBe("pending");
    expect(result.balance).toBe(600);
    expect(result.paidAmount).toBe(400);
  });

  it("suma múltiples pagos para el paidAmount total", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(10) });
    await createTestPayment(invoice.id, { amount: 300 });
    await createTestPayment(invoice.id, { amount: 200 });

    const [result] = await getAllInvoices();
    expect(result.paidAmount).toBe(500);
    expect(result.payments).toHaveLength(2);
  });

  it("excluye facturas borradas lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { description: "Visible" });
    await createTestInvoice(project.id, { description: "Borrada", deletedAt: new Date() });

    const invoices = await getAllInvoices();
    expect(invoices.map((i) => i.description)).toEqual(["Visible"]);
  });

  it("incluye el nombre del cliente y el título del proyecto enlazados", async () => {
    const client = await createTestClient({ name: "Acme Corp" });
    const project = await createTestProject(client.id, { title: "Rediseño Web" });
    await createTestInvoice(project.id);

    const [result] = await getAllInvoices();
    expect(result.client_name).toBe("Acme Corp");
    expect(result.project_title).toBe("Rediseño Web");
  });

  it("ordena por fecha de vencimiento ascendente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { description: "Lejana", dueDate: daysFromNow(30) });
    await createTestInvoice(project.id, { description: "Próxima", dueDate: daysFromNow(1) });

    const invoices = await getAllInvoices();
    expect(invoices.map((i) => i.description)).toEqual(["Próxima", "Lejana"]);
  });
});

describe("createInvoice — numeración automática", () => {
  it("asigna un invoice_number consecutivo con el prefijo de settings, empezando en 0001", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const first = await withTransaction((c) =>
      createInvoice({ project_id: project.id, description: "A", amount: 100, due_date: "2026-06-01" }, user.id, c)
    );
    const second = await withTransaction((c) =>
      createInvoice({ project_id: project.id, description: "B", amount: 100, due_date: "2026-06-01" }, user.id, c)
    );

    expect(first!.invoice_number).toBe("FAC-0001");
    expect(second!.invoice_number).toBe("FAC-0002");
  });

  it("usa el prefijo configurado en settings", async () => {
    await query(`UPDATE settings SET invoice_number_prefix = 'INV-' WHERE id = 1;`);
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const user = await createTestUser();

    const invoice = await withTransaction((c) =>
      createInvoice({ project_id: project.id, description: "A", amount: 100, due_date: "2026-06-01" }, user.id, c)
    );
    expect(invoice!.invoice_number).toBe("INV-0001");
  });

  it("un proyecto inexistente no consume número (devuelve null antes de generar uno)", async () => {
    const user = await createTestUser();
    const result = await withTransaction((c) =>
      createInvoice({ project_id: 999999, description: "A", amount: 100, due_date: "2026-06-01" }, user.id, c)
    );
    expect(result).toBeNull();

    const settingsRes = await query(`SELECT invoice_next_number FROM settings WHERE id = 1;`);
    expect(Number(settingsRes.rows[0].invoice_next_number)).toBe(1);
  });
});

describe("getClientInvoices — portal, solo lectura de lo propio", () => {
  it("solo devuelve facturas del cliente indicado, aislado de otros clientes", async () => {
    const clientA = await createTestClient({ name: "Cliente A" });
    const clientB = await createTestClient({ name: "Cliente B" });
    const projectA = await createTestProject(clientA.id);
    const projectB = await createTestProject(clientB.id);
    await createTestInvoice(projectA.id, { description: "Factura A" });
    await createTestInvoice(projectB.id, { description: "Factura B" });

    const invoicesA = await getClientInvoices(clientA.id);
    expect(invoicesA.map((i) => i.description)).toEqual(["Factura A"]);
  });

  it("calcula saldo/estado igual que getAllInvoices, con el mismo shape", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, dueDate: daysFromNow(-3) });
    await createTestPayment(invoice.id, { amount: 400 });

    const [result] = await getClientInvoices(client.id);
    expect(result.status).toBe("overdue");
    expect(result.balance).toBe(600);
    expect(result.paidAmount).toBe(400);
  });
});
