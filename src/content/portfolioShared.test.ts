import { afterEach, describe, expect, it, vi } from "vitest";
import { countCaseWords, parseCaseText, visibleCaseBlocks } from "@/content/portfolioShared";
import { pickRelatedPostSlugs } from "@/content/portfolioRelated";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseCaseText", () => {
  it("separa párrafos por línea en blanco y reconoce listas con '- '", () => {
    const blocks = parseCaseText("Primer párrafo\ncontinúa aquí.\n\nIntro de lista:\n\n- uno\n- dos\n\nCierre.");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Primer párrafo continúa aquí." },
      { type: "paragraph", text: "Intro de lista:" },
      { type: "list", items: ["uno", "dos"] },
      { type: "paragraph", text: "Cierre." },
    ]);
  });

  it("un bloque mezclado (línea normal + viñetas) sigue siendo un párrafo", () => {
    expect(parseCaseText("Título\n- uno")).toEqual([{ type: "paragraph", text: "Título - uno" }]);
  });

  it("vacío, null y solo espacios no producen bloques (el capítulo se oculta)", () => {
    expect(parseCaseText("")).toEqual([]);
    expect(parseCaseText(null)).toEqual([]);
    expect(parseCaseText("  \n\n \n")).toEqual([]);
  });

  it("normaliza saltos de línea de Windows", () => {
    expect(parseCaseText("A\r\n\r\nB")).toHaveLength(2);
  });
});

describe("visibleCaseBlocks", () => {
  const text = "Dato real.\n\n{{TODO: cifra real}}\n\n- viñeta real\n- {{TODO: viñeta pendiente}}";

  it("en producción omite cada párrafo y cada viñeta con marcador, sin tocar el resto", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(visibleCaseBlocks(text)).toEqual([
      { type: "paragraph", text: "Dato real." },
      { type: "list", items: ["viñeta real"] },
    ]);
  });

  it("un capítulo que solo trae marcadores queda vacío en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(visibleCaseBlocks("{{TODO: a}}\n\n- {{TODO: b}}")).toEqual([]);
  });

  it("fuera de producción muestra los marcadores para poder revisarlos", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(visibleCaseBlocks(text)).toHaveLength(3);
    expect(JSON.stringify(visibleCaseBlocks(text))).toContain("{{TODO: cifra real}}");
  });

  it("NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS=true también los muestra en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SHOW_TODO_PLACEHOLDERS", "true");
    expect(JSON.stringify(visibleCaseBlocks(text))).toContain("{{TODO: cifra real}}");
  });
});

describe("countCaseWords", () => {
  it("cuenta las palabras visibles y no las de los marcadores", () => {
    expect(countCaseWords("Una dos tres.\n\n{{TODO: cuatro cinco seis}}\n\n- siete ocho")).toBe(5);
  });
});

describe("pickRelatedPostSlugs", () => {
  it("reparte por rondas entre servicios y no repite artículos", () => {
    const picked = pickRelatedPostSlugs(["desarrollo-software-medida", "apis-integraciones"], 2);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    expect(picked).toContain("buenas-practicas-apis-rest");
  });

  it("un servicio sin artículos relacionados no rompe y respeta el máximo", () => {
    expect(pickRelatedPostSlugs(["servicio-inexistente"], 2)).toEqual([]);
    expect(pickRelatedPostSlugs(["desarrollo-software-medida"], 1)).toHaveLength(1);
    expect(pickRelatedPostSlugs([], 2)).toEqual([]);
  });
});
