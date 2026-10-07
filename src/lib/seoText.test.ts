import { describe, expect, it } from "vitest";
import { fitTitle, truncateAtWord } from "./seoText";

describe("truncateAtWord", () => {
  it("no toca un texto que ya cabe", () => {
    expect(truncateAtWord("Texto corto", 50)).toBe("Texto corto");
  });
  it("corta en límite de palabra y respeta el máximo", () => {
    const out = truncateAtWord("uno dos tres cuatro cinco seis siete ocho nueve diez", 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("fitTitle", () => {
  it("conserva el título si cabe", () => {
    expect(fitTitle("Racing Bike 1998 · Tienda Online", 50, "Caso de estudio")).toBe("Racing Bike 1998 · Tienda Online");
  });
  it("usa la marca más la etiqueta cuando el título es largo", () => {
    expect(fitTitle("Equilibrio Arquitectónico · Corporate Website & Digital Catalog", 50, "Case study")).toBe(
      "Equilibrio Arquitectónico · Case study"
    );
  });
  it("sin etiqueta recorta por palabra sin pasarse", () => {
    expect(fitTitle("Un título larguísimo sin separador que no cabe en cincuenta caracteres ni de broma", 50).length).toBeLessThanOrEqual(50);
  });
});
