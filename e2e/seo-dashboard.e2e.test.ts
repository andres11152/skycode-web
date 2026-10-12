import { beforeEach, describe, expect, it } from "vitest";
import { loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { upsertGscMetrics } from "../src/lib/queries/seoMetrics";
import { runSeoAnalysis } from "../src/lib/queries/seoAnalysis";
import type { GscRow } from "../src/lib/googleSearchConsole";

// Panel /dashboard/seo con alertas, marca vs. no marca, distancia de ataque, canibalización y semana a semana,
// contra el servidor real. Los datos reproducen el diagnóstico (guía vs. servicio para la misma búsqueda).

const PASSWORD = "SuperSecret123456";
const SITE = "https://skycode.agency";
const GUIDE = `${SITE}/blog/migracion-sistemas-legados-sin-interrupcion`;
const SERVICE = `${SITE}/servicios/migracion-datos-legacy`;
const Q = "servicios de migracion de sistemas legacy";

function week(end: string, build: (date: string) => GscRow[]): GscRow[] {
  const rows: GscRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    rows.push(...build(d.toISOString().slice(0, 10)));
  }
  return rows;
}
const gsc = (date: string, page: string, query: string, impressions: number, position: number, clicks = 0): GscRow => ({ date, page, query, clicks, impressions, ctr: 0, position });

beforeEach(async () => {
  await resetTestDb();
});

describe("GET /dashboard/seo", () => {
  it("muestra las alertas abiertas, la segmentación de marca y la distancia de ataque", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    await upsertGscMetrics([
      ...week("2026-09-14", (d) => [
        gsc(d, GUIDE, Q, 11, 79.9),
        gsc(d, SERVICE, Q, 9, 33.2),
        gsc(d, `${SITE}/`, "skycode", 5, 4.5, 1),
        gsc(d, `${SITE}/fr/services/migration-systemes-legacy`, "migration système legacy", 3, 10.2),
      ]),
      ...week("2026-09-07", (d) => [gsc(d, GUIDE, Q, 11, 79.9), gsc(d, SERVICE, Q, 9, 33.2), gsc(d, `${SITE}/`, "skycode", 5, 4.5)]),
    ]);
    await runSeoAnalysis();

    const client = await loginAs(admin.email, PASSWORD);
    const res = await client.fetch("/dashboard/seo");
    expect(res.status).toBe(200);
    const html = await res.text();
    for (const text of ["Alertas", "Canibalización", "Marca vs. no marca", "Distancia de ataque", "Semana contra semana", "migration système legacy"]) {
      expect(html, text).toContain(text);
    }
    expect(html).toContain("Página equivocada");
    expect(html).toMatch(/2(<!-- -->)? abiertas/);
  });

  it("sales_manager no ve el módulo (seo:read es de admin)", async () => {
    const sales = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const client = await loginAs(sales.email, PASSWORD);
    const res = await client.fetch("/dashboard/seo");
    expect([302, 307]).toContain(res.status);
  });
});
