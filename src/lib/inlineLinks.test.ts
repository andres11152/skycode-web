import { describe, expect, it } from "vitest";
import { parseInlineLinks, stripInlineLinks } from "./inlineLinks";

describe("parseInlineLinks", () => {
  it("separa texto y enlaces internos", () => {
    expect(parseInlineLinks("Ver [el servicio](/servicios/migracion-datos-legacy) hoy.")).toEqual([
      { type: "text", text: "Ver " },
      { type: "link", text: "el servicio", href: "/servicios/migracion-datos-legacy" },
      { type: "text", text: " hoy." },
    ]);
  });

  it("acepta rutas con ancla y varios enlaces en el mismo texto", () => {
    const segments = parseInlineLinks("[a](/#contacto) y [b](/en/blog/x)");
    expect(segments.filter((s) => s.type === "link").map((s) => (s.type === "link" ? s.href : ""))).toEqual([
      "/#contacto",
      "/en/blog/x",
    ]);
  });

  it("nunca convierte en enlace una URL externa ni protocol-relative", () => {
    expect(parseInlineLinks("[x](https://evil.test) [y](//evil.test) [z](javascript:alert(1))")).toEqual([
      { type: "text", text: "[x](https://evil.test) [y](//evil.test) [z](javascript:alert(1))" },
    ]);
  });

  it("un texto sin enlaces queda en un solo segmento", () => {
    expect(parseInlineLinks("Texto [sin] enlace")).toEqual([{ type: "text", text: "Texto [sin] enlace" }]);
  });
});

describe("stripInlineLinks", () => {
  it("deja solo el texto visible", () => {
    expect(stripInlineLinks("Lee [la guía](/blog/x) completa")).toBe("Lee la guía completa");
  });
});
