import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reglas del modo oscuro hechas cumplir en CI (mismo patrón que aiTells.test.ts y motionRules.test.ts).
// Sin ellas el modo oscuro se degrada en silencio: basta UNA banda con `bg-foreground` para que en
// oscuro se vuelva blanca. Ver "Modo oscuro" en CLAUDE.md.
//
//  - las bandas y paneles oscuros usan `bg-inverse`/`text-on-inverse`, no `bg-foreground`/`text-background`;
//  - `text-background` solo acompaña a un control sólido (`bg-foreground`) en el mismo elemento;
//  - el acento como TEXTO es `text-accent-text` (el viejo `text-accent-strong` queda ilegible en oscuro);
//  - nada de colores fijos (`bg-white`, `text-black`, hex) ni de `dark:` ad hoc en componentes públicos.

const ROOT = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/**
 * Superficies PÚBLICAS con modo oscuro. Quedan fuera, a propósito:
 *  - dashboard y portal (fase 5 del plan) y las pantallas de login/recuperación (solo-claro, ver LIGHT_ONLY_PREFIXES);
 *  - `ConditionalLayout` (su `<main>` del panel es de esas rutas solo-claro);
 *  - imágenes OG (`next/og` no lee CSS: se quedan claras).
 */
const EXCLUDED = [
  "/components/dashboard/",
  "/components/portal/",
  "/components/auth/",
  "/app/dashboard/",
  "/app/portal/",
  "/components/ConditionalLayout.tsx",
  "/lib/blogOgImage.tsx",
];

const files = walk(ROOT).filter((path) => !path.endsWith(".test.tsx") && !EXCLUDED.some((part) => path.includes(part)));
const rel = (path: string) => path.replace(`${ROOT}/`, "");
const read = (path: string) => readFileSync(path, "utf8");

/** Literales de texto de un archivo (comillas simples, dobles o plantillas, sin interpolar). */
function stringLiterals(source: string): string[] {
  return [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((match) => match[2]);
}

/**
 * Excepciones documentadas: archivo → valores exactos permitidos y motivo. Acotadas a un valor, no a
 * todo el archivo, para que un color nuevo en el mismo archivo siga fallando. Añadir una exige explicar
 * por qué los tokens no alcanzan.
 */
const ALLOWED_FIXED_COLOR: Record<string, { values: string[]; reason: string }> = {
  "components/ui/SectionRail.tsx": {
    values: ["text-white", "focus-visible:ring-white"],
    reason: "usa mix-blend-mode: difference, que necesita blanco puro para verse igual sobre bandas claras y oscuras",
  },
  "app/layout.tsx": {
    values: ["#ffffff", "#0a0a0b"],
    reason: "themeColor de la barra del navegador: es una <meta>, no CSS, así que no puede leer variables",
  },
  "components/Footer.tsx": {
    values: ["#1877F2", "#E4405F"],
    reason: "color de marca de Facebook e Instagram en el hover de sus iconos (marcas de terceros)",
  },
  "components/sections/Contact.tsx": {
    values: ["#1877F2", "#E4405F"],
    reason: "color de marca de Facebook e Instagram en el hover de sus iconos (marcas de terceros)",
  },
};

const isAllowed = (file: string, value: string) => ALLOWED_FIXED_COLOR[file]?.values.includes(value) ?? false;

describe("modo oscuro: tokens en componentes públicos", () => {
  it("encuentra los componentes (salvaguarda: que el test no pase en vacío)", () => {
    expect(files.length).toBeGreaterThan(80);
  });

  it("ninguna <section>/<aside> usa `bg-foreground` (banda → `bg-inverse`)", () => {
    const hits: string[] = [];
    for (const path of files) {
      for (const tag of read(path).matchAll(/<(section|aside)\b[^>]*>/g)) {
        if (/bg-foreground(?![\w/[-])/.test(tag[0])) hits.push(`${rel(path)}: ${tag[0].replace(/\s+/g, " ").slice(0, 120)}`);
      }
    }
    expect(hits, "usa bg-inverse (y text-on-inverse): en oscuro bg-foreground se vuelve blanco").toEqual([]);
  });

  it("`text-background` solo aparece junto a un `bg-foreground` sólido en el mismo literal (control invertido)", () => {
    const hits: string[] = [];
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        if (!/(?<![\w-])text-background(?![\w-])/.test(literal)) continue;
        if (!/bg-foreground(?![\w/[-])/.test(literal)) hits.push(`${rel(path)}: "${literal.slice(0, 110)}"`);
      }
    }
    expect(hits, "sobre una banda oscura usa text-on-inverse").toEqual([]);
  });

  it("no queda el prefijo de borde/divisor/anillo/degradado hacia `foreground` como superficie oscura", () => {
    const hits: string[] = [];
    const bad = /(?<![\w-])(ring-offset-foreground|from-foreground|via-foreground|to-foreground)(?![\w/[-])/;
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        if (bad.test(literal)) hits.push(`${rel(path)}: "${literal.slice(0, 110)}"`);
      }
    }
    expect(hits, "usa ring-offset-inverse / from-inverse …").toEqual([]);
  });

  it("el acento como texto es `text-accent-text`, nunca `text-accent-strong`", () => {
    const hits: string[] = [];
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        if (/(?<![\w-])(?:[a-z-]+:)*text-accent-strong(?![\w-])/.test(literal)) hits.push(`${rel(path)}: "${literal.slice(0, 110)}"`);
      }
    }
    expect(hits, "text-accent-strong da ~3.3:1 sobre fondo oscuro").toEqual([]);
  });

  it("sin colores fijos de superficie/texto (`bg-white`, `bg-black`, `text-black`…)", () => {
    const hits: string[] = [];
    const fixed = /(?<![\w-])(?:[a-z-]+:)*(bg|border|fill|stroke|text|ring|from|to|via)-(white|black)(?![\w-])/;
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        const match = literal.match(fixed);
        if (match && !isAllowed(rel(path), match[0])) hits.push(`${rel(path)}: ${match[0]}`);
      }
    }
    expect(hits, "usa bg-background / bg-inverse / text-foreground / text-accent-foreground / *-on-inverse").toEqual([]);
  });

  it("sin colores hex en clases ni estilos", () => {
    const hits: string[] = [];
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        for (const match of literal.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
          if (isAllowed(rel(path), match[0])) continue;
          hits.push(`${rel(path)}: ${match[0]} en "${literal.slice(0, 80)}"`);
        }
      }
    }
    expect(hits, "usa var(--token) o color-mix(in srgb, var(--token) NN%, transparent)").toEqual([]);
  });

  it("no hay variantes `dark:` ad hoc (todo pasa por tokens)", () => {
    const hits: string[] = [];
    for (const path of files) {
      for (const literal of stringLiterals(read(path))) {
        if (/(?<![\w-])dark:[a-z![]/.test(literal)) hits.push(`${rel(path)}: "${literal.slice(0, 100)}"`);
      }
    }
    expect(hits).toEqual([]);
  });
});
