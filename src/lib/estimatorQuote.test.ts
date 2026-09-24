import { describe, expect, it } from "vitest";
import { computeEstimatorQuote } from "./estimatorQuote";

describe("computeEstimatorQuote", () => {
  it("calcula precio y semanas para 'web' + addon 'auth' en ritmo normal (COP)", () => {
    // web: priceCop 4_500_000, baseWeeks 3 | auth: priceCop 950_000, weeks 0.5
    // (ver PRICING/ADDON_PRICING en content/projectEstimator.ts)
    const result = computeEstimatorQuote({
      typeId: "web",
      addonIds: ["auth"],
      pace: "standard",
      currency: "COP",
      locale: "es",
    });

    expect(result).not.toBeNull();
    expect(result!.totalPrice).toBe(5_450_000);
    expect(result!.totalWeeks).toBe(4); // ceil(3 + 0.5)
    expect(result!.formattedTotal).toBe("$5.450.000 COP");
    expect(result!.addonTitles).toHaveLength(1);
  });

  it("aplica el recargo del 25% y el recorte de tiempo del ritmo express", () => {
    const result = computeEstimatorQuote({
      typeId: "web",
      addonIds: ["auth"],
      pace: "express",
      currency: "COP",
      locale: "es",
    });

    // rawPrice 5_450_000 * 1.25 = 6_812_500; rawWeeks 4 * 0.75 = 3
    expect(result!.totalPrice).toBe(6_812_500);
    expect(result!.totalWeeks).toBe(3);
  });

  it("nunca deja las semanas por debajo de 2, incluso en express con el proyecto más corto", () => {
    // apis: baseWeeks 3, sin addons -> express: round(3 * 0.75) = 2 (ya en el piso)
    const result = computeEstimatorQuote({
      typeId: "apis",
      addonIds: [],
      pace: "express",
      currency: "COP",
      locale: "es",
    });
    expect(result!.totalWeeks).toBeGreaterThanOrEqual(2);
  });

  it("calcula en USD usando los precios de esa moneda, no una conversión de COP", () => {
    const result = computeEstimatorQuote({
      typeId: "web",
      addonIds: [],
      pace: "standard",
      currency: "USD",
      locale: "en",
    });
    expect(result!.totalPrice).toBe(1150); // priceUsd de "web"
    expect(result!.formattedTotal).toBe("$1,150 USD");
  });

  it("ignora addon-ids que no existen en el catálogo, sin fallar", () => {
    const result = computeEstimatorQuote({
      typeId: "web",
      addonIds: ["no-existe", "auth"],
      pace: "standard",
      currency: "COP",
      locale: "es",
    });
    expect(result!.addonTitles).toHaveLength(1);
  });

  it("null para un typeId que no existe en el catálogo — nunca inventa una cotización", () => {
    expect(
      computeEstimatorQuote({ typeId: "no-existe", addonIds: [], pace: "standard", currency: "COP", locale: "es" })
    ).toBeNull();
  });

  it("los títulos vienen en el idioma pedido", () => {
    const es = computeEstimatorQuote({ typeId: "web", addonIds: [], pace: "standard", currency: "COP", locale: "es" });
    const en = computeEstimatorQuote({ typeId: "web", addonIds: [], pace: "standard", currency: "USD", locale: "en" });
    expect(es!.typeTitle).not.toBe(en!.typeTitle);
  });
});
