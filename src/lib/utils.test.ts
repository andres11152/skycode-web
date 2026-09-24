import { describe, expect, it } from "vitest";
import { cn, escapeHtml, formatMoney, slugify, toCsvCell } from "./utils";

describe("toCsvCell", () => {
  it("wraps plain values in quotes", () => {
    expect(toCsvCell("Ada")).toBe('"Ada"');
  });

  it("escapes embedded double quotes", () => {
    expect(toCsvCell('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("neutralizes leading = to prevent CSV formula injection", () => {
    expect(toCsvCell("=cmd|'/c calc'!A1")).toBe(`"'=cmd|'/c calc'!A1"`);
  });

  it("neutralizes leading +, -, and @ as well", () => {
    expect(toCsvCell("+1+1")).toBe(`"'+1+1"`);
    expect(toCsvCell("-1")).toBe(`"'-1"`);
    expect(toCsvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
  });

  it("leaves safe values untouched aside from quoting", () => {
    expect(toCsvCell("normal text")).toBe('"normal text"');
  });

  it("accepts numbers", () => {
    expect(toCsvCell(42)).toBe('"42"');
  });
});

describe("formatMoney", () => {
  it("formatea COP sin decimales, con símbolo de peso", () => {
    const formatted = formatMoney(1500000, "COP");
    expect(formatted).toContain("1.500.000");
    expect(formatted).toMatch(/\$/);
    expect(formatted).not.toMatch(/,\d\d$/); // sin centavos
  });

  it("formatea USD con 2 decimales", () => {
    const formatted = formatMoney(1500.5, "USD");
    expect(formatted).toContain("1,500.50");
    expect(formatted).toMatch(/\$/);
  });

  it("maneja cero y negativos sin reventar", () => {
    expect(formatMoney(0, "COP")).toBeTruthy();
    expect(formatMoney(-100, "USD")).toContain("100");
  });
});

describe("slugify", () => {
  it("convierte a minúsculas y reemplaza espacios por guiones", () => {
    expect(slugify("Hola Mundo")).toBe("hola-mundo");
  });

  it("quita acentos", () => {
    expect(slugify("Múltiples Días Después")).toBe("multiples-dias-despues");
  });

  it("quita caracteres no alfanuméricos", () => {
    expect(slugify("¿Qué tal, todo bien?")).toBe("que-tal-todo-bien");
  });

  it("no deja guiones al principio o al final", () => {
    expect(slugify("  espacios  ")).toBe("espacios");
  });
});

describe("escapeHtml", () => {
  it("neutraliza una etiqueta con handler de evento (XSS en un correo HTML)", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("escapa el ampersand", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("deja intacto un texto sin caracteres especiales", () => {
    expect(escapeHtml("Consultoría técnica")).toBe("Consultoría técnica");
  });
});

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind (la última gana)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});
