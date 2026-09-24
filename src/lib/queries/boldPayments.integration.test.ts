import { beforeEach, describe, expect, it } from "vitest";
import { getInvoiceForCheckout, isInvoiceOwnedByClient, recordBoldPaymentIfNew } from "./boldPayments";
import { query } from "../db";
import { createTestClient, createTestInvoice, createTestPayment, createTestProject, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("isInvoiceOwnedByClient", () => {
  it("true cuando la factura pertenece, vía su proyecto, al cliente indicado", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id);

    expect(await isInvoiceOwnedByClient(invoice.id, client.id)).toBe(true);
  });

  it("false cuando la factura es de otro cliente", async () => {
    const client = await createTestClient();
    const otherClient = await createTestClient({ email: "otro@example.com" });
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id);

    expect(await isInvoiceOwnedByClient(invoice.id, otherClient.id)).toBe(false);
  });

  it("false para una factura con borrado lógico", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { deletedAt: new Date() });

    expect(await isInvoiceOwnedByClient(invoice.id, client.id)).toBe(false);
  });
});

describe("getInvoiceForCheckout", () => {
  it("devuelve el saldo real (amount - pagos ya registrados), no el monto bruto", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000, currency: "USD" });
    await createTestPayment(invoice.id, { amount: 400 });

    const checkout = await getInvoiceForCheckout(invoice.id);
    expect(checkout).not.toBeNull();
    expect(checkout!.balance).toBe(600);
    expect(checkout!.currency).toBe("USD");
  });

  it("null cuando la factura ya está saldada por completo", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000 });
    await createTestPayment(invoice.id, { amount: 1000 });

    expect(await getInvoiceForCheckout(invoice.id)).toBeNull();
  });

  it("null para una factura inexistente o borrada", async () => {
    expect(await getInvoiceForCheckout(999999)).toBeNull();

    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { deletedAt: new Date() });
    expect(await getInvoiceForCheckout(invoice.id)).toBeNull();
  });
});

describe("recordBoldPaymentIfNew", () => {
  it("inserta el pago la primera vez", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000 });

    const result = await recordBoldPaymentIfNew({
      invoiceId: invoice.id,
      amount: 1000,
      paidAt: "2026-01-15",
      providerReference: "BOLD-TX-001",
    });

    expect(result.inserted).toBe(true);
    expect(result.paymentId).not.toBeNull();

    const row = await query("SELECT provider, provider_reference, amount FROM payments WHERE id = $1;", [result.paymentId]);
    expect(row.rows[0].provider).toBe("bold");
    expect(row.rows[0].provider_reference).toBe("BOLD-TX-001");
    expect(Number(row.rows[0].amount)).toBe(1000);
  });

  it("es idempotente: el mismo providerReference dos veces no duplica el pago", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 1000 });

    const first = await recordBoldPaymentIfNew({
      invoiceId: invoice.id,
      amount: 1000,
      paidAt: "2026-01-15",
      providerReference: "BOLD-TX-DUPLICADO",
    });
    const second = await recordBoldPaymentIfNew({
      invoiceId: invoice.id,
      amount: 1000,
      paidAt: "2026-01-15",
      providerReference: "BOLD-TX-DUPLICADO",
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.paymentId).toBeNull();

    const count = await query("SELECT COUNT(*)::int AS n FROM payments WHERE provider_reference = $1;", [
      "BOLD-TX-DUPLICADO",
    ]);
    expect(count.rows[0].n).toBe(1);
  });

  it("dos payment_id distintos para la misma factura sí generan dos pagos (dos ventas reales)", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 2000 });

    await recordBoldPaymentIfNew({ invoiceId: invoice.id, amount: 1000, paidAt: "2026-01-01", providerReference: "TX-A" });
    await recordBoldPaymentIfNew({ invoiceId: invoice.id, amount: 1000, paidAt: "2026-01-02", providerReference: "TX-B" });

    const count = await query("SELECT COUNT(*)::int AS n FROM payments WHERE invoice_id = $1;", [invoice.id]);
    expect(count.rows[0].n).toBe(2);
  });

  it("no inserta nada si la factura no existe", async () => {
    const result = await recordBoldPaymentIfNew({
      invoiceId: 999999,
      amount: 1000,
      paidAt: "2026-01-15",
      providerReference: "BOLD-TX-FACTURA-INEXISTENTE",
    });
    expect(result.inserted).toBe(false);
  });

  it("un pago manual (sin provider_reference) nunca choca con el índice único parcial", async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);
    const invoice = await createTestInvoice(project.id, { amount: 3000 });

    await createTestPayment(invoice.id, { amount: 1000 }); // pago manual, provider_reference NULL
    const boldResult = await recordBoldPaymentIfNew({
      invoiceId: invoice.id,
      amount: 1000,
      paidAt: "2026-01-15",
      providerReference: "BOLD-TX-CONVIVE-CON-MANUAL",
    });

    expect(boldResult.inserted).toBe(true);
    const count = await query("SELECT COUNT(*)::int AS n FROM payments WHERE invoice_id = $1;", [invoice.id]);
    expect(count.rows[0].n).toBe(2);
  });
});
