import { describe, expect, it } from "vitest";
import { LAX_CSP_SOURCE, buildLaxCsp, buildStrictCsp, generateNonce, isStrictCspPath } from "./csp";

function directive(csp: string, name: string): string {
  return csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
}

describe("isStrictCspPath", () => {
  it("rutas de sesión y credenciales son estrictas", () => {
    for (const path of ["/login", "/olvide-password", "/resetear-password/abc", "/invitar/abc", "/dashboard", "/dashboard/leads", "/portal", "/portal/cuenta"]) {
      expect(isStrictCspPath(path), path).toBe(true);
    }
  });

  it("el sitio de marketing NO es estricto (seguiría estático)", () => {
    for (const path of ["/", "/en", "/fr", "/blog", "/blog/un-post", "/servicios/x", "/portafolio/x", "/equipo", "/cotizador", "/propuesta/uuid", "/en/blog"]) {
      expect(isStrictCspPath(path), path).toBe(false);
    }
  });

  it("no confunde prefijos parecidos", () => {
    expect(isStrictCspPath("/login-falso")).toBe(false);
    expect(isStrictCspPath("/dashboardx")).toBe(false);
    expect(isStrictCspPath("/portal-clientes")).toBe(false);
  });
});

describe("LAX_CSP_SOURCE (patrón de next.config.ts)", () => {
  // path-to-regexp envuelve el patrón con ^…$; acá se prueba el lookahead directo.
  const regex = new RegExp(`^${LAX_CSP_SOURCE}$`);

  it("excluye exactamente las rutas estrictas", () => {
    for (const path of ["/login", "/dashboard", "/dashboard/leads", "/portal/cuenta", "/olvide-password", "/resetear-password/t", "/invitar/t"]) {
      expect(regex.test(path), path).toBe(false);
    }
    for (const path of ["/", "/blog/x", "/equipo", "/login-falso", "/api/auth/login", "/propuesta/u"]) {
      expect(regex.test(path), path).toBe(true);
    }
  });
});

describe("buildStrictCsp", () => {
  const csp = buildStrictCsp("NONCE123");

  it("scripts: solo con nonce + strict-dynamic, SIN unsafe-inline", () => {
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain("'nonce-NONCE123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("estilos: <style> con nonce; solo los atributos style siguen inline", () => {
    expect(directive(csp, "style-src")).toContain("'nonce-NONCE123'");
    expect(directive(csp, "style-src")).not.toContain("'unsafe-inline'");
    expect(directive(csp, "style-src-attr")).toContain("'unsafe-inline'");
  });

  it("mantiene las protecciones de siempre", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("worker-src 'self'");
  });
});

describe("buildLaxCsp", () => {
  it("conserva unsafe-inline (el sitio estático lo necesita) y los hosts de Google Ads/Bold", () => {
    const csp = buildLaxCsp();
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    expect(scriptSrc).toContain("https://checkout.bold.co");
    expect(scriptSrc).not.toContain("nonce-");
  });
});

describe("generateNonce", () => {
  it("es único por llamada y base64 válido", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonces.size).toBe(200);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});
