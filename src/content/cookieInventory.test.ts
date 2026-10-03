import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { STORAGE_INVENTORY } from "./cookieInventory";

/**
 * Garantiza que la Política de Cookies nunca vuelva a mentir: cualquier clave
 * que el código escriba en el navegador tiene que estar declarada en
 * `cookieInventory.ts` (de donde salen la tabla de la política y el centro de
 * preferencias). Mismo criterio que `sqlSafety.test.ts`: agregar una escritura
 * nueva rompe el CI hasta que se declare.
 */

const SRC = path.resolve(__dirname, "..");

/** Claves que NO son del visitante del sitio público (viven solo en /dashboard) y no se declaran. */
const DASHBOARD_ONLY = /[\\/]components[\\/]dashboard[\\/]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Constantes de texto `const X = "…"` de todo `src/`, para resolver claves importadas de otro archivo. */
function collectStringConstants(files: string[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*string)?\s*=\s*["'`]([^"'`$\n]+)["'`]/g)) {
      if (!constants.has(m[1])) constants.set(m[1], m[2]);
    }
  }
  return constants;
}

/** Resuelve el primer argumento: literal directo o constante de texto conocida. */
function resolveKey(arg: string, constants: Map<string, string>): string | null {
  const literal = arg.match(/^["'`]([^"'`$]+)["'`]$/);
  if (literal) return literal[1];
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(arg)) return constants.get(arg) ?? null;
  return null;
}

function collectWrites(): { file: string; key: string }[] {
  const found: { file: string; key: string }[] = [];
  const files = walk(SRC);
  const constants = collectStringConstants(files);
  for (const file of files) {
    if (DASHBOARD_ONLY.test(file)) continue;
    const source = readFileSync(file, "utf8");
    const rel = path.relative(SRC, file);

    for (const m of source.matchAll(/(?:local|session)Storage\s*\.\s*setItem\(\s*([^,]+?)\s*,/g)) {
      const key = resolveKey(m[1], constants);
      found.push({ file: rel, key: key ?? `<<no resoluble: ${m[1]}>>` });
    }
    for (const m of source.matchAll(/document\.cookie\s*=\s*[`"'](?:\$\{([A-Za-z_]+)\}|([A-Za-z0-9_-]+))=/g)) {
      const key = m[2] ?? resolveKey(m[1], constants);
      found.push({ file: rel, key: key ?? `<<no resoluble: ${m[1]}>>` });
    }
    for (const m of source.matchAll(/cookie[s]?\s*\.\s*set\(\s*\{[^}]*?name:\s*([^,]+?)\s*,/g)) {
      const key = resolveKey(m[1], constants);
      found.push({ file: rel, key: key ?? `<<no resoluble: ${m[1]}>>` });
    }
  }
  return found;
}

describe("cookieInventory", () => {
  const declared = new Set(STORAGE_INVENTORY.map((entry) => entry.name));

  it("declares every key the public site writes to the browser", () => {
    const writes = collectWrites();
    // La cookie de sesión se fija desde una función con nombre dinámico
    // (`SESSION_COOKIE_NAME`, con prefijo __Host- en producción): se verifica aparte.
    const undeclared = writes.filter(
      ({ key }) => !declared.has(key) && !key.includes("SESSION_COOKIE_NAME"),
    );
    expect(undeclared).toEqual([]);
  });

  it("finds the writes it is supposed to guard (the scanner itself works)", () => {
    const keys = new Set(collectWrites().map((w) => w.key));
    expect(keys.has("skycode-attribution")).toBe(true);
    expect(keys.has("skycode-pending-contact-prefill")).toBe(true);
    expect(keys.has("skycode-geo-country")).toBe(true);
  });

  it("has no duplicated names and describes every entry", () => {
    expect(declared.size).toBe(STORAGE_INVENTORY.length);
    for (const entry of STORAGE_INVENTORY) {
      expect(entry.purpose.length).toBeGreaterThan(20);
      expect(entry.duration.length).toBeGreaterThan(0);
    }
  });
});
