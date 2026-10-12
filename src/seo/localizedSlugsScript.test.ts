import { describe, expect, it } from "vitest";
// Script de datos en JS plano (corre fuera de Next): se importa su lógica pura, nunca su `main`.
import { rewriteBlocks, rewriteLinks } from "../../scripts/seo-localized-slugs.mjs";
import type { BlogBlock } from "@/content/blogShared";

describe("script seo-localized-slugs: reescritura de enlaces", () => {
  it("lleva servicios y posts a su slug nativo y arregla los enlaces sin prefijo de idioma", () => {
    const text = "Ver [servicio](/en/servicios/migracion-datos-legacy), la [guía](/en/blog/migracion-sistemas-legados-sin-interrupcion) y el [portafolio](/portafolio).";
    const { text: out, changed } = rewriteLinks(text, "en");
    expect(out).toBe(
      "Ver [servicio](/en/services/legacy-software-migration), la [guía](/en/blog/legacy-system-migration-without-downtime) y el [portafolio](/en/portfolio)."
    );
    expect(changed).toBe(3);
  });

  it("es idempotente y no toca el español", () => {
    const text = "[a](/servicios/migracion-datos-legacy) [b](/blog/deuda-tecnica-como-detectarla)";
    expect(rewriteLinks(text, "es")).toEqual({ text, changed: 0 });
    const once = rewriteLinks("[x](/fr/servicios/apis-integraciones)", "fr").text;
    expect(rewriteLinks(once, "fr")).toEqual({ text: once, changed: 0 });
  });

  it("recorre párrafos, listas y respuestas de FAQ y deja intactos el resto de bloques", () => {
    const content: BlogBlock[] = [
      { type: "paragraph", text: "[a](/fr/servicios/seguridad-cumplimiento)" },
      { type: "list", items: ["[b](/cotizador)", "sin enlace"] },
      { type: "faq", items: [{ question: "¿Q?", answer: "[c](/fr/blog/buenas-practicas-apis-rest)" }] },
      { type: "code", language: "ts", code: "const x = '[no](/servicios/x)';" },
    ];
    const { blocks, changed } = rewriteBlocks(content, "fr");
    expect(changed).toBe(3);
    expect(blocks[0]).toEqual({ type: "paragraph", text: "[a](/fr/services/securite-logicielle-conformite)" });
    expect(blocks[1]).toEqual({ type: "list", items: ["[b](/fr/cotizador)", "sin enlace"] });
    expect(blocks[2]).toEqual({ type: "faq", items: [{ question: "¿Q?", answer: "[c](/fr/blog/architecture-api-rest-bonnes-pratiques)" }] });
    expect(blocks[3]).toEqual(content[3]);
  });
});
