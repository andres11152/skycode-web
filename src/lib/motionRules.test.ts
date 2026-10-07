import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reglas de movimiento del sitio, hechas cumplir en CI (mismo patrón que aiTells.test.ts y
// cookieInventory.test.ts): una animación que rompa estas reglas rompe el build, no depende
// de que alguien se acuerde. Ver "Animación" en CLAUDE.md.
//
//  - nada de `transition-all` (anima cualquier propiedad, incluido layout);
//  - los keyframes solo mueven `opacity`/`transform`/`filter` (nunca layout);
//  - las animaciones infinitas (spinners, pings) llevan `motion-safe:` o una anulación en
//    `prefers-reduced-motion`;
//  - el Hero (H1 y párrafo = LCP) no se anima (solo su panel visual: inclinación y parallax);
//  - RevealText y los efectos `reveal-*` no se usan sobre el hero.

const ROOT = join(process.cwd(), "src");

function walk(dir: string, filter: (path: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, filter, out);
    else if (filter(path)) out.push(path);
  }
  return out;
}

const publicTsx = walk(ROOT, (path) => path.endsWith(".tsx") && !path.includes("/dashboard/") && !path.includes("/portal/"));
const read = (path: string) => readFileSync(path, "utf8");
const rel = (path: string) => path.replace(`${ROOT}/`, "");
const publicCss = ["app/globals.css", "app/theme.css"].map((file) => ({ file, css: read(join(ROOT, file)) }));

describe("reglas de movimiento: componentes públicos", () => {
  it("ningún componente usa `transition-all`", () => {
    const hits = publicTsx.filter((file) => /(^|[\s"'`:])transition-all(?![\w-])/.test(read(file))).map(rel);
    expect(hits).toEqual([]);
  });

  it("las animaciones infinitas de Tailwind (spin/ping/pulse/bounce) llevan `motion-safe:`", () => {
    const pattern = /(?<![\w:-])animate-(spin|ping|pulse|bounce)(?![\w-])/g;
    const hits = publicTsx
      .filter((file) => !rel(file).startsWith("components/auth/")) // pantallas de login: spinner de envío
      .flatMap((file) => (read(file).match(pattern) ?? []).map((match) => `${rel(file)}: ${match}`));
    expect(hits).toEqual([]);
  });

  it("el Hero no se anima (su H1 y su párrafo son el LCP)", () => {
    const hero = read(join(ROOT, "components/sections/Hero.tsx"));
    expect(hero).not.toMatch(/framer-motion/);
    expect(hero).not.toMatch(/\bassemble\b|\bscroll-reveal\b|\breveal-[a-z]+\b|RevealText|\bword-(mask|inner)\b|animate-/);
    // Solo el panel visual y el resplandor pueden llevar parallax/inclinación; nunca el H1 ni los párrafos.
    expect(hero).not.toMatch(/<(h1|p)\b[^>]*\b(parallax|parallax-exit)\b/);
  });
});

describe("reglas de movimiento: página local de Bogotá", () => {
  const view = read(join(ROOT, "components/bogota/BogotaView.tsx"));
  const MOTION = /\b(reveal-[a-z]+|scroll-reveal|word-(mask|inner)|assemble|parallax|RevealWords|RevealText|animate-)\b/;

  it("el H1 y el párrafo de entrada del hero no se animan (son el LCP)", () => {
    const h1 = /<h1\b[\s\S]*?<\/h1>/.exec(view)?.[0] ?? "";
    const lead = /<p className="max-w-2xl[^>]*>\s*\{hero\.lead\}\s*<\/p>/.exec(view)?.[0] ?? "";
    expect(h1).not.toBe("");
    expect(lead).not.toBe("");
    expect(h1).not.toMatch(MOTION);
    expect(lead).not.toMatch(MOTION);
  });

  it("la barra de progreso y el cursor tienen su versión estática con reduced motion", () => {
    const css = publicCss[0].css;
    expect(css).toMatch(/\.page-progress\s*\{\s*display:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.caret-blink/);
  });

  it("el hover de las tarjetas usa `translate`, no `transform` (los reveal-* fijan su transform final)", () => {
    const lift = /\.lift:hover[\s\S]*?\{([^}]*)\}/.exec(publicCss[0].css)?.[1] ?? "";
    expect(lift).toMatch(/\btranslate:/);
    expect(lift).not.toMatch(/\btransform:/);
  });
});

describe("reglas de movimiento: CSS global", () => {
  const LAYOUT_PROPS = /(^|[;{\s])(width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*)\s*:/;

  it("los @keyframes solo animan opacity/transform/filter, nunca layout", () => {
    const hits: string[] = [];
    // Salvaguarda: si el parseo dejara de encontrar keyframes, el test pasaría en vacío.
    const total = publicCss.reduce((sum, { css }) => sum + [...css.matchAll(/@keyframes\s+[\w-]+/g)].length, 0);
    expect(total).toBeGreaterThan(10);
    for (const { file, css } of publicCss) {
      for (const match of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
        if (LAYOUT_PROPS.test(match[2])) hits.push(`${file}: @keyframes ${match[1]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("ningún @keyframes ligado al scroll usa `filter` (no se compone: repinta en el hilo principal)", () => {
    const hits: string[] = [];
    for (const { file, css } of publicCss) {
      for (const match of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
        // `via-blur` es del par `.morph` de las transiciones de vista (una sola vez, no por cuadro de scroll).
        if (match[1] !== "via-blur" && /(^|[;{\s])(backdrop-)?filter\s*:/.test(match[2])) hits.push(`${file}: @keyframes ${match[1]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("toda animación `infinite` tiene su anulación bajo prefers-reduced-motion", () => {
    const hits: string[] = [];
    for (const { file, css } of publicCss) {
      const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*animation:[^{}]*infinite[^{}]*)\}/g)) {
        const selector = rule[1].trim().split("\n").pop() ?? "";
        const className = /\.([\w-]+)/.exec(selector)?.[1];
        if (className && !reduced.includes(className)) hits.push(`${file}: ${selector}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
