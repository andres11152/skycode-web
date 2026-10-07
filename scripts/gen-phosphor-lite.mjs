// Genera src/lib/phosphor/index.ts: los íconos de Phosphor que usa el sitio, con solo los pesos que se
// usan (regular, bold, duotone, fill) y como datos (trazos), no como `Map` de 6 `createElement` por
// ícono. `@phosphor-icons/react` evalúa al cargar el módulo de cada ícono un Map con sus 6 pesos
// (React elements): con ~20 íconos en la portada eran ~145 KB de JS y ~110 ms de evaluación
// (a 6x de CPU) antes de hidratar. Los trazos salen del paquete instalado, no se dibujan a mano.
//
//   node scripts/gen-phosphor-lite.mjs      (idempotente; lo dispara `npm run gen:phosphor`)
//
// next.config.ts (turbopack.resolveAlias) apunta `@phosphor-icons/react` y `/ssr` a este módulo en
// tiempo de compilación; los tipos siguen viniendo del paquete real. `phosphor/phosphor.test.ts` compara
// el SVG de cada ícono y peso contra el original.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const WEIGHTS = ["regular", "bold", "duotone", "fill"];
const SKIP_NAMES = new Set(["Icon", "IconProps", "IconWeight", "IconContext", "IconBase", "SSRBase"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mjs)$/.test(entry) && !/\.test\./.test(entry)) out.push(path);
  }
  return out;
}

const names = new Set();
const importRe = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']@phosphor-icons\/react(?:\/ssr)?["']/g;
for (const file of walk(join(root, "src"))) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(importRe)) {
    if (match[1]) continue; // import type
    for (const part of match[2].split(",")) {
      const cleaned = part.trim().replace(/^type\s+/, "");
      if (!cleaned || part.trim().startsWith("type ")) continue;
      const name = cleaned.split(/\s+as\s+/)[0].trim();
      if (name && !SKIP_NAMES.has(name)) names.add(name);
    }
  }
}

const defsDir = join(root, "node_modules/@phosphor-icons/react/dist/defs");
const sorted = [...names].sort();
const body = [];
for (const name of sorted) {
  const source = readFileSync(join(defsDir, `${name}.es.js`), "utf8");
  const data = {};
  const blockRe = /\[\s*"(\w+)",\s*\/\* @__PURE__ \*\/ \w+\.createElement\(\w+\.Fragment, null,([\s\S]*?)\)\s*\]/g;
  for (const block of source.matchAll(blockRe)) {
    const weight = block[1];
    if (!WEIGHTS.includes(weight)) continue;
    const paths = [];
    const expected = (block[2].match(/"path"/g) ?? []).length;
    for (const element of block[2].matchAll(/createElement\(\s*"path",\s*\{([^}]*)\}\s*\)/g)) {
      const attrs = Object.fromEntries([...element[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
      const extra = Object.keys(attrs).filter((k) => k !== "d" && k !== "opacity");
      if (extra.length > 0 || !attrs.d) throw new Error(`${name}/${weight}: atributo no soportado ${extra.join(",")}`);
      paths.push(attrs.opacity ? [attrs.d, attrs.opacity] : [attrs.d]);
    }
    if (paths.length !== expected) throw new Error(`${name}/${weight}: ${paths.length} trazos leídos de ${expected}`);
    data[weight] = paths;
  }
  for (const weight of WEIGHTS) if (!data[weight]) throw new Error(`${name}: falta el peso ${weight}`);
  body.push({ name, data: JSON.stringify(data) });
}

const factory = `// ARCHIVO GENERADO por scripts/gen-phosphor-lite.mjs: no editar a mano.
// Fábrica de íconos de Phosphor (MIT, https://phosphoricons.com) a partir de trazos. Un peso desconocido
// cae a regular. Mismo SVG que \`@phosphor-icons/react\` (lo verifica phosphor.test.ts).
import { createElement, forwardRef, type ReactElement, type SVGProps } from "react";

export type Weight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
export type Path = readonly [d: string, opacity?: string];

export interface LiteIconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  alt?: string;
  color?: string;
  size?: string | number;
  weight?: Weight;
  mirrored?: boolean;
}

export function icon(name: string, weights: Record<string, readonly Path[]>) {
  const Component = forwardRef<SVGSVGElement, LiteIconProps>(function LiteIcon(
    { alt, color = "currentColor", size = "1em", weight = "regular", mirrored = false, children, ...rest },
    ref
  ): ReactElement {
    const paths = weights[weight] ?? weights.regular;
    return createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        fill: color,
        viewBox: "0 0 256 256",
        transform: mirrored ? "scale(-1, 1)" : undefined,
        ...rest,
      },
      alt ? createElement("title", null, alt) : null,
      children,
      paths.map(([d, opacity]) => createElement("path", { key: d, d, opacity }))
    );
  });
  Component.displayName = \`\${name}Icon\`;
  return Component;
}
`;
const outDir = join(root, "src/lib/phosphor");
mkdirSync(join(outDir, "icons"), { recursive: true });
for (const stale of readdirSync(join(outDir, "icons"))) rmSync(join(outDir, "icons", stale));
writeFileSync(join(outDir, "icon.ts"), factory);
const barrel = [];
for (const entry of body) {
  const name = entry.name;
  writeFileSync(
    join(outDir, "icons", `${name}.ts`),
    `// ARCHIVO GENERADO por scripts/gen-phosphor-lite.mjs: no editar a mano.\nimport { icon } from "../icon";\n\nexport const ${name} = /* @__PURE__ */ icon("${name}", ${entry.data});\n`
  );
  barrel.push(`export { ${name} } from "./icons/${name}";`);
}
writeFileSync(
  join(outDir, "index.ts"),
  `// ARCHIVO GENERADO por scripts/gen-phosphor-lite.mjs: no editar a mano.\n// Un módulo por ícono: el bundler solo incluye los que se importan (ver icon.ts).\n${barrel.join("\n")}\n`
);
console.log(`src/lib/phosphor: ${sorted.length} íconos (${sorted.join(", ")})`);
