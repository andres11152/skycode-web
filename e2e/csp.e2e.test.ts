import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, TestClient } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

function directive(csp: string, name: string): string {
  return csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
}

function nonceOf(csp: string): string {
  const match = csp.match(/'nonce-([^']+)'/);
  expect(match, "la CSP debería traer un nonce").not.toBeNull();
  return match![1];
}

/** Atributos nonce de los <script> ejecutables del HTML (no los JSON-LD, que no ejecutan). */
function scriptNonces(html: string): string[] {
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  return tags.filter((t) => !/type="application\/(ld\+)?json"/.test(t)).map((t) => t.match(/nonce="([^"]*)"/)?.[1] ?? "");
}

describe("CSP estricta (nonce) en las superficies de sesión y credenciales", () => {
  for (const path of ["/login", "/olvide-password", "/resetear-password/00000000-0000-4000-8000-000000000000", "/invitar/00000000-0000-4000-8000-000000000000"]) {
    it(`${path}: scripts solo con nonce + strict-dynamic, sin unsafe-inline`, async () => {
      const res = await new TestClient().get(path);
      expect(res.status).toBe(200);

      const csp = res.headers.get("content-security-policy") ?? "";
      const scriptSrc = directive(csp, "script-src");
      expect(scriptSrc).toContain("'strict-dynamic'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(directive(csp, "style-src")).not.toContain("'unsafe-inline'");

      // Todos los scripts ejecutables del HTML llevan EL nonce de esta respuesta.
      const nonce = nonceOf(csp);
      const nonces = scriptNonces(await res.text());
      expect(nonces.length).toBeGreaterThan(0);
      expect(nonces.filter((n) => n !== nonce)).toEqual([]);
    });
  }

  it("el nonce cambia en cada petición (si fuera fijo, un atacante lo reutilizaría)", async () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const res = await new TestClient().get("/login");
      nonces.add(nonceOf(res.headers.get("content-security-policy") ?? ""));
    }
    expect(nonces.size).toBe(5);
  });

  it("emite UNA sola política CSP (no se mezclan la laxa y la estricta)", async () => {
    const res = await new TestClient().get("/login");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).not.toContain("'unsafe-inline'; ");
    expect(csp.match(/script-src/g)).toHaveLength(1);
  });

  it("/dashboard con sesión: política estricta con el nonce en sus scripts", async () => {
    const user = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const client = await loginAs(user.email, "SuperSecret123456");

    const res = await client.get("/dashboard");
    expect(res.status).toBe(200);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(directive(csp, "script-src")).not.toContain("'unsafe-inline'");
    const nonce = nonceOf(csp);
    expect(scriptNonces(await res.text()).filter((n) => n !== nonce)).toEqual([]);
  });

  it("/dashboard sin sesión redirige a /login (la CSP estricta no cambia el control de acceso)", async () => {
    const res = await new TestClient().get("/dashboard");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});

describe("El sitio de marketing conserva la política laxa (y sigue siendo estático)", () => {
  for (const path of ["/", "/en", "/blog", "/equipo", "/servicios"]) {
    it(`${path}: unsafe-inline, sin nonce`, async () => {
      const res = await new TestClient().get(path);
      expect(res.status).toBe(200);
      const scriptSrc = directive(res.headers.get("content-security-policy") ?? "", "script-src");
      expect(scriptSrc).toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("nonce-");
    });
  }

  it("la home se sirve desde caché estática, no se renderiza por request", async () => {
    await new TestClient().get("/");
    const res = await new TestClient().get("/");
    expect(res.headers.get("x-nextjs-cache")).toBe("HIT");
  });
});
