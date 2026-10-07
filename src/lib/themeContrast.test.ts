import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contraste WCAG de cada par de colores del sistema, en los DOS temas, leído de
 * `theme.css` (no de una copia): si alguien cambia un valor y rompe la accesibilidad,
 * el CI falla. Es la garantía de que el modo oscuro no se degrada con el tiempo.
 */

const CSS = readFileSync(path.resolve(__dirname, "../app/theme.css"), "utf8");

type Tokens = Record<string, string>;

function block(source: string, startRegex: RegExp): string {
  const match = startRegex.exec(source);
  if (!match) throw new Error(`No se encontró el bloque ${startRegex}`);
  let depth = 0;
  for (let i = match.index + match[0].length - 1; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(match.index + match[0].length, i);
  }
  throw new Error("Bloque sin cerrar");
}

function tokens(body: string): Tokens {
  const out: Tokens = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const light = tokens(block(CSS, /^:root\s*\{/m));
const darkExplicit = tokens(block(CSS, /:root\[data-dark-ready\]\[data-theme="dark"\]\s*\{/));
const darkSystem = tokens(block(block(CSS, /@media \(prefers-color-scheme: dark\)\s*\{/), /:root\[data-dark-ready\]:not\(\[data-theme="light"\]\)\s*\{/));
const dark: Tokens = { ...light, ...darkExplicit };

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** Mezcla `alpha` de `fg` sobre `bg` (compositing sRGB, como hace el navegador con `text-foreground/80`). */
function over(fg: string, alpha: number, bg: string): Rgb {
  const f = rgb(fg);
  const b = rgb(bg);
  return f.map((c, i) => c * alpha + b[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AAA = 7;
const AA = 4.5;
const GRAPHIC = 3;

describe("los dos bloques oscuros son idénticos", () => {
  it("elección explícita y prefers-color-scheme declaran los mismos tokens", () => {
    expect(darkSystem).toEqual(darkExplicit);
    expect(Object.keys(darkExplicit).length).toBeGreaterThan(0);
  });

  it("el oscuro solo redefine tokens que existen en el claro", () => {
    for (const name of Object.keys(darkExplicit)) expect(light, name).toHaveProperty(name);
  });
});

for (const [themeName, t] of [["claro", light], ["oscuro", dark]] as const) {
  describe(`contraste WCAG, tema ${themeName}`, () => {
    const bg = t.background;
    const fg = t.foreground;

    it("texto de lectura (foreground/80) sobre el fondo: AAA", () => {
      expect(contrast(over(fg, 0.8, bg), rgb(bg))).toBeGreaterThanOrEqual(AAA);
    });

    it("foreground pleno sobre fondo, tarjeta elevada y pozo: AAA", () => {
      for (const surface of [bg, t["surface-raised"], t["surface-sunken"]]) {
        expect(contrast(rgb(fg), rgb(surface)), surface).toBeGreaterThanOrEqual(AAA);
      }
    });

    it("metadata (foreground/60) sobre el fondo y la tarjeta: AA", () => {
      for (const surface of [bg, t["surface-raised"]]) {
        expect(contrast(over(fg, 0.6, surface), rgb(surface)), surface).toBeGreaterThanOrEqual(AA);
      }
    });

    it("banda de contraste: on-inverse (pleno y /80) sobre inverse: AAA", () => {
      expect(contrast(rgb(t["on-inverse"]), rgb(t.inverse))).toBeGreaterThanOrEqual(AAA);
      expect(contrast(over(t["on-inverse"], 0.8, t.inverse), rgb(t.inverse))).toBeGreaterThanOrEqual(AAA);
    });

    it("el acento como TEXTO (accent-text) cumple AA en fondo, tarjeta y pozo", () => {
      for (const surface of [bg, t["surface-raised"], t["surface-sunken"]]) {
        expect(contrast(rgb(t["accent-text"]), rgb(surface)), surface).toBeGreaterThanOrEqual(AA);
      }
    });

    it("sobre la banda de contraste, el texto de acento es `accent` (no accent-text) y cumple AA", () => {
      // En claro, accent-text es azul oscuro para superficies claras: sobre la banda negra
      // daría 3.3:1. Por eso las bandas usan siempre `text-accent`, que sirve en los dos temas.
      expect(contrast(rgb(t.accent), rgb(t.inverse))).toBeGreaterThanOrEqual(AA);
    });

    it("el relleno de botón (accent-strong + texto blanco) cumple AA", () => {
      expect(contrast(rgb(t["accent-foreground"]), rgb(t["accent-strong"]))).toBeGreaterThanOrEqual(AA);
    });

    it("el acento como icono/gráfico (accent) llega a 3:1 sobre fondo y banda", () => {
      for (const surface of [bg, t.inverse]) {
        expect(contrast(rgb(t.accent), rgb(surface)), surface).toBeGreaterThanOrEqual(GRAPHIC);
      }
    });
  });
}

describe("el claro no cambió (tokens nuevos = comportamiento anterior)", () => {
  it("inverse/on-inverse reproducen bg-foreground + text-background", () => {
    expect(light.inverse).toBe(light.foreground);
    expect(light["on-inverse"]).toBe(light.background);
  });

  it("accent-text reproduce text-accent-strong", () => {
    expect(light["accent-text"]).toBe(light["accent-strong"]);
  });
});
