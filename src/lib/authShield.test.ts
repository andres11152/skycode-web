import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "./authShield";

describe("normalizeIdentifier", () => {
  it("pasa a minúsculas y recorta espacios", () => {
    expect(normalizeIdentifier("  Admin@Test.COM ")).toBe("admin@test.com");
  });

  it("quita NUL y demás caracteres de control (Postgres los rechaza como parámetro)", () => {
    expect(normalizeIdentifier("a@b.com\u0000")).toBe("a@b.com");
    expect(normalizeIdentifier("\u0000")).toBe("");
    expect(normalizeIdentifier("a\u0001b\u007fc\nd")).toBe("abcd");
  });

  it("acota la longitud para que una clave nunca crezca sin límite", () => {
    expect(normalizeIdentifier("x".repeat(1000))).toHaveLength(254);
  });
});
