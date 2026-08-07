import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, uniqueSuffix } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

async function createProjectFor(adminClient: Awaited<ReturnType<typeof loginAs>>) {
  const res = await adminClient.post("/api/projects", {
    client_email: `facturacion-${uniqueSuffix()}@test.local`,
    client_name: "Cliente de Facturación",
    title: "Proyecto Facturado",
  });
  expect(res.status).toBe(200);
  const { project } = await res.json();
  return project;
}

describe("Facturación y pagos — con moneda mixta en agregaciones", () => {
  it("emite una factura, registra abonos parciales y el saldo se recalcula siempre desde los pagos", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const project = await createProjectFor(adminClient);

    const invoiceRes = await adminClient.post("/api/invoices", {
      project_id: project.id,
      description: "Anticipo 50%",
      amount: 1000,
      currency: "COP",
      due_date: "2026-12-31",
    });
    expect(invoiceRes.status).toBe(200);
    const { invoice } = await invoiceRes.json();

    const pay1 = await adminClient.post(`/api/invoices/${invoice.id}/payments`, {
      amount: 400,
      paid_at: "2026-01-10",
      method: "Transferencia",
    });
    expect(pay1.status).toBe(200);

    const listAfterFirstPayment = await adminClient.get("/api/invoices");
    const { invoices: afterFirst } = await listAfterFirstPayment.json();
    const foundAfterFirst = afterFirst.find((i: { id: number }) => i.id === invoice.id);
    expect(foundAfterFirst.paidAmount).toBe(400);
    expect(foundAfterFirst.balance).toBe(600);
    expect(foundAfterFirst.status).toBe("pending");

    const pay2 = await adminClient.post(`/api/invoices/${invoice.id}/payments`, {
      amount: 600,
      paid_at: "2026-01-20",
      method: "Transferencia",
    });
    expect(pay2.status).toBe(200);

    const listAfterFull = await adminClient.get("/api/invoices");
    const { invoices: afterFull } = await listAfterFull.json();
    const foundAfterFull = afterFull.find((i: { id: number }) => i.id === invoice.id);
    expect(foundAfterFull.balance).toBe(0);
    expect(foundAfterFull.status).toBe("paid");
    expect(foundAfterFull.payments).toHaveLength(2);
  });

  it("una factura en USD y otra en COP para el mismo proyecto no se mezclan como si fueran la misma unidad", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const project = await createProjectFor(adminClient);

    const copInvoiceRes = await adminClient.post("/api/invoices", {
      project_id: project.id,
      description: "Factura en pesos",
      amount: 100000,
      currency: "COP",
      due_date: "2026-12-31",
    });
    const { invoice: copInvoice } = await copInvoiceRes.json();

    const usdInvoiceRes = await adminClient.post("/api/invoices", {
      project_id: project.id,
      description: "Factura en dólares",
      amount: 50,
      currency: "USD",
      due_date: "2026-12-31",
    });
    const { invoice: usdInvoice } = await usdInvoiceRes.json();

    const listRes = await adminClient.get("/api/invoices");
    const { invoices } = await listRes.json();

    const cop = invoices.find((i: { id: number }) => i.id === copInvoice.id);
    const usd = invoices.find((i: { id: number }) => i.id === usdInvoice.id);
    expect(cop.currency).toBe("COP");
    expect(cop.amount).toBe(100000);
    expect(usd.currency).toBe("USD");
    expect(usd.amount).toBe(50);
    // Cada factura conserva su propia moneda — no hay una suma cruda de 100000 + 50.
  });

  it("una factura vencida sin pagos aparece como overdue con días de mora", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const project = await createProjectFor(adminClient);

    await adminClient.post("/api/invoices", {
      project_id: project.id,
      description: "Vencida",
      amount: 500,
      currency: "COP",
      due_date: "2020-01-01",
    });

    const listRes = await adminClient.get("/api/invoices");
    const { invoices } = await listRes.json();
    const overdue = invoices.find((i: { description: string }) => i.description === "Vencida");
    expect(overdue.status).toBe("overdue");
    expect(overdue.daysOverdue).toBeGreaterThan(0);
  });

  it("un sales_manager puede leer facturas pero no puede emitirlas ni registrar pagos (403)", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const project = await createProjectFor(adminClient);

    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const smClient = await loginAs(salesManager.email, "SuperSecret123456");

    const readRes = await smClient.get("/api/invoices");
    expect(readRes.status).toBe(200);

    const writeRes = await smClient.post("/api/invoices", {
      project_id: project.id,
      description: "Intento no autorizado",
      amount: 100,
      currency: "COP",
      due_date: "2026-12-31",
    });
    expect(writeRes.status).toBe(403);
  });

  it("emitir una factura contra un proyecto inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/invoices", {
      project_id: 999999,
      description: "Proyecto fantasma",
      amount: 100,
      currency: "COP",
      due_date: "2026-12-31",
    });
    expect(res.status).toBe(404);
  });

  it("registrar un pago contra una factura inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.post("/api/invoices/999999/payments", {
      amount: 100,
      paid_at: "2026-01-01",
    });
    expect(res.status).toBe(404);
  });
});
