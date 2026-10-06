import { describe, expect, it } from "vitest";
import {
  cn,
  escapeHtml,
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatShortDate,
  slugify,
  toCsvCell,
} from "./utils";

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

describe("formatDate con fechas sin hora", () => {
  it("muestra el mismo día de calendario, sin correrse por la zona horaria", () => {
    expect(formatDate("2026-10-02")).toBe("2 de octubre de 2026");
    expect(formatDate("2026-10-02", "en")).toBe("October 2, 2026");
    expect(formatDate("2026-01-01")).toBe("1 de enero de 2026");
  });
});

describe("formatos compactos del panel", () => {
  it("una columna DATE nunca cae al día anterior en Bogotá", () => {
    expect(formatCalendarDate("2026-10-06")).toBe("6 de oct de 2026");
    // Así llega un DATE serializado por `pg` sin `::text` (medianoche UTC).
    expect(formatCalendarDate("2026-10-06T00:00:00.000Z")).toBe("6 de oct de 2026");
    expect(formatCalendarDate("2026-10-06", "dayMonth")).toBe("6 de oct");
  });

  it("un instante se muestra en hora de Bogotá", () => {
    // 02:00 UTC del 7 = 21:00 del 6 en Bogotá.
    expect(formatShortDate("2026-10-07T02:00:00Z")).toBe("6 de oct de 2026");
    expect(formatShortDate("2026-10-07T02:00:00Z", "monthYear")).toBe("octubre de 2026");
    expect(formatDateTime("2026-10-06T20:45:00Z")).toBe("6 de oct de 2026, 3:45 p. m.");
  });

  it("formatNumber usa separadores de es-CO", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});
