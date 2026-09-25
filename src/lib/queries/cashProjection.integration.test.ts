import { beforeEach, describe, expect, it } from "vitest";
import { getCashProjection } from "./cashProjection";
import {
  createTestClient,
  createTestInvoice,
  createTestPayment,
  createTestProject,
  createTestProposal,
  resetTestDb,
} from "../testHelpers/db";

const RATE = 4000;

beforeEach(async () => {
  await resetTestDb();
});

describe("getCashProjection — facturas (ingresos confirmados)", () => {
  it("agrupa el saldo pendiente de una factura vencida en el bucket 'overdue'", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, currency: "COP", dueDate: "2020-01-01" });

    const projection = await getCashProjection(RATE);
    const overdue = projection.invoiceBuckets.find((b) => b.key === "overdue")!;
    expect(overdue.totalCop).toBe(1000);
    expect(projection.totalConfirmedCop).toBe(1000);
  });

  it("agrupa una factura con vencimiento este mes en el bucket 'current'", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const today = new Date().toISOString().slice(0, 10);
    await createTestInvoice(project.id, { amount: 500, currency: "COP", dueDate: today });

    const projection = await getCashProjection(RATE);
    const current = projection.invoiceBuckets.find((b) => b.key === "current")!;
    expect(current.totalCop).toBe(500);
  });

  it("convierte facturas en USD a COP con la tasa dada", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 100, currency: "USD", dueDate: "2020-01-01" });

    const projection = await getCashProjection(RATE);
    const overdue = projection.invoiceBuckets.find((b) => b.key === "overdue")!;
    expect(overdue.totalCop).toBe(100 * RATE);
  });

  it("una factura completamente pagada no aporta saldo (balance <= 0 se excluye)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, currency: "COP", dueDate: "2020-01-01" });
    await createTestPayment(invoice.id, { amount: 1000 });

    const projection = await getCashProjection(RATE);
    expect(projection.totalConfirmedCop).toBe(0);
  });

  it("ignora facturas borradas lógicamente", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, currency: "COP", dueDate: "2020-01-01", deletedAt: new Date() });

    const projection = await getCashProjection(RATE);
    expect(projection.totalConfirmedCop).toBe(0);
  });
});

describe("getCashProjection — propuestas (ingresos probables)", () => {
  it("una propuesta enviada (sin ver) cae en el bucket 'sent' con 30% de probabilidad", async () => {
    await createTestProposal({ items: [{ unitPrice: 1000, quantity: 1 }], taxRate: 0 });

    const projection = await getCashProjection(RATE);
    const sent = projection.proposalBuckets.find((b) => b.status === "sent")!;
    expect(sent.count).toBe(1);
    expect(sent.totalCop).toBe(1000);
    expect(sent.probabilityPct).toBe(30);
    expect(sent.weightedCop).toBeCloseTo(300);
  });

  it("una propuesta vista cae en el bucket 'viewed' con 50% de probabilidad", async () => {
    await createTestProposal({ items: [{ unitPrice: 1000, quantity: 1 }], taxRate: 0, viewedAt: new Date() });

    const projection = await getCashProjection(RATE);
    const viewed = projection.proposalBuckets.find((b) => b.status === "viewed")!;
    expect(viewed.count).toBe(1);
    expect(viewed.weightedCop).toBeCloseTo(500);
  });

  it("aplica el IVA de la propuesta antes de ponderar", async () => {
    await createTestProposal({ items: [{ unitPrice: 1000, quantity: 1 }], taxRate: 19 });

    const projection = await getCashProjection(RATE);
    const sent = projection.proposalBuckets.find((b) => b.status === "sent")!;
    expect(sent.totalCop).toBeCloseTo(1190);
  });

  it("excluye propuestas ya aceptadas, rechazadas o vencidas", async () => {
    await createTestProposal({ acceptedAt: new Date() });
    await createTestProposal({ rejectedAt: new Date() });
    await createTestProposal({ validUntil: "2020-01-01" });

    const projection = await getCashProjection(RATE);
    expect(projection.proposalBuckets.every((b) => b.count === 0)).toBe(true);
    expect(projection.totalWeightedProbableCop).toBe(0);
  });
});

describe("getCashProjection — total", () => {
  it("suma confirmado + probable ponderado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    await createTestInvoice(project.id, { amount: 1000, currency: "COP", dueDate: "2020-01-01" });
    await createTestProposal({ items: [{ unitPrice: 1000, quantity: 1 }], taxRate: 0, viewedAt: new Date() });

    const projection = await getCashProjection(RATE);
    expect(projection.totalConfirmedCop).toBe(1000);
    expect(projection.totalWeightedProbableCop).toBeCloseTo(500);
    expect(projection.totalProjectedCop).toBeCloseTo(1500);
  });
});
