import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  buildBoldCheckoutConfig,
  buildBoldOrderId,
  computeBoldIntegritySignature,
  fetchBoldPaymentVoucher,
  isBoldConfigured,
  verifyBoldWebhookSignature,
} from "./bold";
import { parseInvoiceIdFromBoldOrderId } from "./boldShared";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("computeBoldIntegritySignature", () => {
  it("calza con el ejemplo documentado por Bold (orderId/amount/currency/secretKey conocidos)", () => {
    process.env.BOLD_SECRET_KEY = "kgfq2nN0o52XqnuXZWIN2F";
    const signature = computeBoldIntegritySignature({ orderId: "inv0334", amount: 39400, currency: "COP" });
    // sha256("inv033439400COPkgfq2nN0o52XqnuXZWIN2F"), verificado aparte con node:crypto.
    expect(signature).toBe("620a64c6eab8858d0f96d4f818a1d77be5e9b9eb9dc681f527de1af54fc1b739");
  });

  it("usa string vacío como llave secreta cuando BOLD_SECRET_KEY no está configurada (modo pruebas de Bold)", () => {
    delete process.env.BOLD_SECRET_KEY;
    const withUndefined = computeBoldIntegritySignature({ orderId: "x", amount: 1, currency: "COP" });

    process.env.BOLD_SECRET_KEY = "";
    const withEmpty = computeBoldIntegritySignature({ orderId: "x", amount: 1, currency: "COP" });

    expect(withUndefined).toBe(withEmpty);
  });

  it("cambia si cambia cualquiera de los 4 componentes", () => {
    process.env.BOLD_SECRET_KEY = "secreto";
    const base = computeBoldIntegritySignature({ orderId: "a", amount: 100, currency: "COP" });
    expect(computeBoldIntegritySignature({ orderId: "b", amount: 100, currency: "COP" })).not.toBe(base);
    expect(computeBoldIntegritySignature({ orderId: "a", amount: 200, currency: "COP" })).not.toBe(base);
    expect(computeBoldIntegritySignature({ orderId: "a", amount: 100, currency: "USD" })).not.toBe(base);
  });
});

describe("verifyBoldWebhookSignature", () => {
  function signLikeBold(rawBody: string, secretKey: string): string {
    const encoded = Buffer.from(rawBody, "utf8").toString("base64");
    return createHmac("sha256", secretKey).update(encoded).digest("hex");
  }

  it("acepta una firma calculada correctamente (base64 del body -> HMAC-SHA256 -> hex)", () => {
    process.env.BOLD_SECRET_KEY = "mi-llave-secreta";
    const body = JSON.stringify({ type: "SALE_APPROVED" });
    const signature = signLikeBold(body, "mi-llave-secreta");

    expect(verifyBoldWebhookSignature(body, signature)).toBe(true);
  });

  it("rechaza una firma que no calza", () => {
    process.env.BOLD_SECRET_KEY = "mi-llave-secreta";
    expect(verifyBoldWebhookSignature('{"type":"SALE_APPROVED"}', "firma-falsa-cualquiera")).toBe(false);
  });

  it("rechaza si no hay header de firma", () => {
    expect(verifyBoldWebhookSignature("{}", null)).toBe(false);
    expect(verifyBoldWebhookSignature("{}", undefined)).toBe(false);
  });

  it("funciona con llave vacía (modo pruebas de Bold), documentado explícitamente por ellos", () => {
    process.env.BOLD_SECRET_KEY = "";
    const body = '{"type":"SALE_APPROVED"}';
    const signature = signLikeBold(body, "");
    expect(verifyBoldWebhookSignature(body, signature)).toBe(true);
  });

  it("un solo carácter distinto en el body invalida la firma", () => {
    process.env.BOLD_SECRET_KEY = "llave";
    const original = '{"amount":100}';
    const tampered = '{"amount":900}';
    const signature = signLikeBold(original, "llave");
    expect(verifyBoldWebhookSignature(tampered, signature)).toBe(false);
  });
});

describe("buildBoldOrderId / parseInvoiceIdFromBoldOrderId", () => {
  it("genera un order-id que su propio parser puede leer de vuelta", () => {
    const orderId = buildBoldOrderId(42);
    expect(orderId).toMatch(/^inv-42-[a-f0-9]{8}$/);
    expect(parseInvoiceIdFromBoldOrderId(orderId)).toBe(42);
  });

  it("dos llamadas para la misma factura generan order-ids distintos (reintentos de pago)", () => {
    const first = buildBoldOrderId(7);
    const second = buildBoldOrderId(7);
    expect(first).not.toBe(second);
  });

  it("devuelve null para formatos que no calzan", () => {
    expect(parseInvoiceIdFromBoldOrderId("no-es-un-order-id")).toBeNull();
    expect(parseInvoiceIdFromBoldOrderId("inv-abc-12345678")).toBeNull();
    expect(parseInvoiceIdFromBoldOrderId("inv-42-tooShort")).toBeNull();
    expect(parseInvoiceIdFromBoldOrderId("")).toBeNull();
  });
});

describe("isBoldConfigured / buildBoldCheckoutConfig", () => {
  it("false/null cuando falta la llave de identidad pública", () => {
    delete process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY;
    expect(isBoldConfigured()).toBe(false);
    expect(
      buildBoldCheckoutConfig({ invoiceId: 1, amount: 1000, currency: "COP", description: "x", redirectionUrl: "https://x" })
    ).toBeNull();
  });

  it("arma la configuración completa cuando la llave existe", () => {
    process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY = "llave-publica-de-prueba";
    process.env.BOLD_SECRET_KEY = "secreto";

    const config = buildBoldCheckoutConfig({
      invoiceId: 5,
      amount: 250000,
      currency: "COP",
      description: "Factura FAC-0005",
      redirectionUrl: "https://skycode.agency/portal",
    });

    expect(config).not.toBeNull();
    expect(config!.apiKey).toBe("llave-publica-de-prueba");
    expect(config!.amount).toBe(250000);
    expect(config!.currency).toBe("COP");
    expect(config!.orderId).toMatch(/^inv-5-[a-f0-9]{8}$/);
    expect(config!.integritySignature).toHaveLength(64);
  });
});

describe("fetchBoldPaymentVoucher", () => {
  it("null cuando Bold responde 404 'no encontrada' (forma real verificada en vivo: {payload: {}, errors: [...]})", async () => {
    process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY = "llave-de-prueba";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ payload: {}, errors: [{ message: "La referencia x no fue encontrada" }] }),
      })
    );

    expect(await fetchBoldPaymentVoucher("inv-1-aabbccdd")).toBeNull();
  });

  it("devuelve el payload cuando Bold encuentra el pago (200, errors vacío)", async () => {
    process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY = "llave-de-prueba";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          payload: { payment_status: "APPROVED", transaction_id: "TX-1", total: 50000 },
          errors: [],
        }),
      })
    );

    const voucher = await fetchBoldPaymentVoucher("inv-1-aabbccdd");
    expect(voucher).toEqual({ payment_status: "APPROVED", transaction_id: "TX-1", total: 50000 });
  });

  it("null si no hay llave de identidad configurada (nunca llama a fetch)", async () => {
    delete process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await fetchBoldPaymentVoucher("inv-1-aabbccdd")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("null si la respuesta no trae un JSON parseable", async () => {
    process.env.NEXT_PUBLIC_BOLD_IDENTITY_KEY = "llave-de-prueba";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json");
        },
      })
    );

    expect(await fetchBoldPaymentVoucher("inv-1-aabbccdd")).toBeNull();
  });
});
