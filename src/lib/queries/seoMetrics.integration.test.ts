import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDb } from "../testHelpers/db";
import { getContentGaps, getSeoSummary, getTopPages, getTopQueries, hasAnyGscData, upsertGscMetrics } from "./seoMetrics";
import type { GscRow } from "../googleSearchConsole";

beforeEach(async () => {
  await resetTestDb();
});

function row(overrides: Partial<GscRow>): GscRow {
  return {
    date: "2026-09-01",
    page: "https://skycode.agency/servicios/desarrollo-software-medida",
    query: "desarrollo de software a la medida",
    clicks: 0,
    impressions: 10,
    ctr: 0,
    position: 12,
    ...overrides,
  };
}

describe("hasAnyGscData", () => {
  it("es false antes de cualquier upsert y true después", async () => {
    expect(await hasAnyGscData()).toBe(false);
    await upsertGscMetrics([row({})]);
    expect(await hasAnyGscData()).toBe(true);
  });
});

describe("upsertGscMetrics", () => {
  it("inserta filas nuevas y deriva el locale del prefijo de la URL", async () => {
    await upsertGscMetrics([
      row({ page: "https://skycode.agency/servicios/x", query: "a" }),
      row({ page: "https://skycode.agency/en/services/x", query: "b" }),
      row({ page: "https://skycode.agency/fr/services/x", query: "c" }),
    ]);

    const pages = await getTopPages(365, 10);
    const byPage = Object.fromEntries(pages.map((p) => [p.page, p.locale]));
    expect(byPage["https://skycode.agency/servicios/x"]).toBe("es");
    expect(byPage["https://skycode.agency/en/services/x"]).toBe("en");
    expect(byPage["https://skycode.agency/fr/services/x"]).toBe("fr");
  });

  it("es idempotente: re-insertar la misma clave (fecha+página+query) actualiza en vez de duplicar", async () => {
    await upsertGscMetrics([row({ clicks: 1, impressions: 10 })]);
    await upsertGscMetrics([row({ clicks: 5, impressions: 50 })]);

    const summary = await getSeoSummary(365);
    expect(summary.totalClicks).toBe(5);
    expect(summary.totalImpressions).toBe(50);
  });

  it("no falla con un array vacío", async () => {
    await expect(upsertGscMetrics([])).resolves.toBe(0);
    expect(await hasAnyGscData()).toBe(false);
  });
});

describe("getSeoSummary", () => {
  it("agrega clics/impresiones y promedia CTR y posición ponderados por impresiones", async () => {
    await upsertGscMetrics([
      row({ query: "a", clicks: 2, impressions: 20, ctr: 0.1, position: 5 }),
      row({ query: "b", clicks: 0, impressions: 80, ctr: 0, position: 25 }),
    ]);

    const summary = await getSeoSummary(365);
    expect(summary.totalClicks).toBe(2);
    expect(summary.totalImpressions).toBe(100);
    expect(summary.avgCtr).toBeCloseTo(0.02, 5); // 2 clics / 100 impresiones
    expect(summary.avgPosition).toBeCloseTo((5 * 20 + 25 * 80) / 100, 5);
  });

  it("respeta la ventana de días: no cuenta filas fuera del rango", async () => {
    await upsertGscMetrics([row({ date: "2020-01-01", clicks: 99, impressions: 99 })]);
    const summary = await getSeoSummary(7);
    expect(summary.totalClicks).toBe(0);
    expect(summary.totalImpressions).toBe(0);
  });
});

describe("getContentGaps", () => {
  it("incluye solo queries con cero clics y posición 4-30", async () => {
    await upsertGscMetrics([
      row({ query: "sin-clics-en-rango", clicks: 0, impressions: 50, position: 10 }),
      row({ query: "con-clics", clicks: 3, impressions: 50, position: 10 }),
      row({ query: "top3-sin-clics", clicks: 0, impressions: 50, position: 2 }),
      row({ query: "muy-lejos-sin-clics", clicks: 0, impressions: 50, position: 80 }),
    ]);

    const gaps = await getContentGaps(365, 20);
    const queries = gaps.map((g) => g.query);
    expect(queries).toEqual(["sin-clics-en-rango"]);
  });
});

describe("getTopQueries", () => {
  it("agrega la misma query a través de varias páginas y ordena por impresiones", async () => {
    await upsertGscMetrics([
      row({ page: "https://skycode.agency/a", query: "misma-query", impressions: 30 }),
      row({ page: "https://skycode.agency/b", query: "misma-query", impressions: 20 }),
      row({ query: "otra-query", impressions: 5 }),
    ]);

    const top = await getTopQueries(365, 10);
    expect(top[0]).toMatchObject({ query: "misma-query", impressions: 50 });
    expect(top[1]).toMatchObject({ query: "otra-query", impressions: 5 });
  });
});
