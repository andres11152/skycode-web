import { describe, expect, it } from "vitest";
import { buildInvoiceWhatsappMessage, buildInvoiceWhatsappUrl } from "./invoiceWhatsapp";

describe("buildInvoiceWhatsappMessage", () => {
  it("incluye el número de factura, el saldo y los días de mora", () => {
    const message = buildInvoiceWhatsappMessage({
      client_name: "Ana",
      invoice_number: "FAC-0001",
      balance: 500,
      currency: "USD",
      daysOverdue: 5,
    });
    expect(message).toContain("FAC-0001");
    expect(message).toContain("5 días");
    expect(message).toContain("Ana");
  });

  it("usa singular 'día' cuando la mora es de exactamente 1 día", () => {
    const message = buildInvoiceWhatsappMessage({
      client_name: "Ana",
      invoice_number: "FAC-0001",
      balance: 500,
      currency: "USD",
      daysOverdue: 1,
    });
    expect(message).toContain("1 día");
    expect(message).not.toContain("1 días");
  });

  it("usa un texto genérico cuando no hay número de factura legible", () => {
    const message = buildInvoiceWhatsappMessage({
      client_name: "Ana",
      invoice_number: null,
      balance: 500,
      currency: "COP",
      daysOverdue: 3,
    });
    expect(message).toContain("tu factura pendiente");
  });
});

describe("buildInvoiceWhatsappUrl", () => {
  it("devuelve null cuando el cliente no tiene teléfono", () => {
    expect(
      buildInvoiceWhatsappUrl({ client_name: "Ana", client_phone: null, invoice_number: "FAC-0001", balance: 500, currency: "USD", daysOverdue: 5 })
    ).toBeNull();
    expect(
      buildInvoiceWhatsappUrl({ client_name: "Ana", client_phone: "", invoice_number: "FAC-0001", balance: 500, currency: "USD", daysOverdue: 5 })
    ).toBeNull();
  });

  it("construye un enlace wa.me con el teléfono saneado y el texto codificado", () => {
    const url = buildInvoiceWhatsappUrl({
      client_name: "Ana",
      client_phone: "+57 313 808 1081",
      invoice_number: "FAC-0001",
      balance: 500,
      currency: "USD",
      daysOverdue: 5,
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/\+573138081081\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1])).toContain("FAC-0001");
  });
});
