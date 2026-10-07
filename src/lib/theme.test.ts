import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildLaxCsp, buildStrictCsp, STRICT_CSP_PREFIXES } from "./csp";
import {
  LIGHT_ONLY_PREFIXES,
  THEME_INIT_SCRIPT,
  THEME_SCRIPT_SHA256,
  THEME_STORAGE_KEY,
  isLightOnlyPath,
} from "./theme";

/** Ejecuta el script del <head> contra un `document`/`location`/`localStorage` simulados. */
function runInitScript(opts: { pathname: string; stored?: string | null; storageThrows?: boolean }): string | null {
  let attr: string | null = null;
  const document = { documentElement: { setAttribute: (_: string, v: string) => (attr = v) } };
  const location = { pathname: opts.pathname };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error("SecurityError");
      expect(key).toBe(THEME_STORAGE_KEY);
      return opts.stored ?? null;
    },
  };
  new Function("document", "location", "localStorage", THEME_INIT_SCRIPT)(document, location, localStorage);
  return attr;
}

describe("script anti-destello", () => {
  it("el hash declarado coincide con el texto real (si falla, se editó el script)", () => {
    const real = `sha256-${createHash("sha256").update(THEME_INIT_SCRIPT, "utf8").digest("base64")}`;
    expect(
      THEME_SCRIPT_SHA256,
      `Recalcula el hash: node -e 'console.log("sha256-"+require("crypto").createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64"))' → ${real}`,
    ).toBe(real);
  });

  it("es mínimo: no usa eval ni red, y pesa menos de 400 bytes", () => {
    expect(Buffer.byteLength(THEME_INIT_SCRIPT)).toBeLessThan(400);
    expect(THEME_INIT_SCRIPT).not.toMatch(/eval|fetch|XMLHttpRequest|innerHTML|document\.write/);
  });

  it("aplica la elección guardada", () => {
    expect(runInitScript({ pathname: "/", stored: "dark" })).toBe("dark");
    expect(runInitScript({ pathname: "/en/blog/x", stored: "light" })).toBe("light");
  });

  it("sin elección (o con basura) no toca nada: manda el sistema", () => {
    expect(runInitScript({ pathname: "/", stored: null })).toBeNull();
    expect(runInitScript({ pathname: "/", stored: "system" })).toBeNull();
    expect(runInitScript({ pathname: "/", stored: "<script>" })).toBeNull();
  });

  it("las rutas solo-claro fuerzan claro aunque haya elegido oscuro", () => {
    for (const pathname of ["/login", "/dashboard", "/dashboard/leads", "/portal/cuenta", "/invitar/t"]) {
      expect(runInitScript({ pathname, stored: "dark" }), pathname).toBe("light");
    }
  });

  it("no revienta si localStorage está bloqueado", () => {
    expect(runInitScript({ pathname: "/", storageThrows: true })).toBeNull();
  });
});

describe("rutas solo-claro", () => {
  it("coinciden con las superficies de CSP estricta (sesión y credenciales)", () => {
    expect([...LIGHT_ONLY_PREFIXES]).toEqual([...STRICT_CSP_PREFIXES]);
  });

  it("isLightOnlyPath no confunde prefijos parecidos", () => {
    expect(isLightOnlyPath("/dashboard/x")).toBe(true);
    expect(isLightOnlyPath("/dashboardx")).toBe(false);
    expect(isLightOnlyPath("/blog")).toBe(false);
    expect(isLightOnlyPath("/")).toBe(false);
  });
});

describe("CSP y script del tema", () => {
  it("la estricta autoriza el script por hash", () => {
    expect(buildStrictCsp("N")).toContain(`'${THEME_SCRIPT_SHA256}'`);
  });

  it("la laxa NO lleva el hash: con un hash el navegador ignoraría 'unsafe-inline' y Next no hidrataría", () => {
    const lax = buildLaxCsp();
    expect(lax).not.toContain("sha256-");
    expect(lax).toContain("'unsafe-inline'");
  });
});
