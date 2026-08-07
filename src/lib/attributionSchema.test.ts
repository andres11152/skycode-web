import { describe, expect, it } from "vitest";
import { AttributionFieldsSchema } from "./attributionSchema";

describe("AttributionFieldsSchema", () => {
  it("acepta un objeto vacío — un visitante directo sin UTMs sigue siendo válido", () => {
    const result = AttributionFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("acepta todos los campos de atribución juntos", () => {
    const result = AttributionFieldsSchema.safeParse({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "lanzamiento-2026",
      utm_term: "software a medida",
      utm_content: "anuncio-1",
      gclid: "abc123",
      fbclid: "xyz789",
      referrer: "https://google.com",
      landing_page: "/",
    });
    expect(result.success).toBe(true);
  });

  it("recorta espacios en blanco", () => {
    const result = AttributionFieldsSchema.safeParse({ utm_source: "  google  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.utm_source).toBe("google");
  });

  it("rechaza un utm_campaign absurdamente largo (protección contra abuso)", () => {
    const result = AttributionFieldsSchema.safeParse({ utm_campaign: "a".repeat(300) });
    expect(result.success).toBe(false);
  });

  it("rechaza un referrer que exceda su límite propio (2000, más laxo que los UTM)", () => {
    const tooLong = AttributionFieldsSchema.safeParse({ referrer: "a".repeat(2001) });
    expect(tooLong.success).toBe(false);
    const atLimit = AttributionFieldsSchema.safeParse({ referrer: "a".repeat(2000) });
    expect(atLimit.success).toBe(true);
  });

  it("ignora campos no declarados sin fallar (zod los descarta por defecto)", () => {
    const result = AttributionFieldsSchema.safeParse({ utm_source: "google", campo_inventado: "algo" });
    expect(result.success).toBe(true);
  });
});
