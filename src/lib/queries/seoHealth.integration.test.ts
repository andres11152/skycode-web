import { beforeEach, describe, expect, it } from "vitest";
import { query } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";
import { auditParsedPage, summarizeReport, type SeoHealthReport } from "../seoHealth";
import { getLatestSeoHealthRun, getSeoHealthHistory, saveSeoHealthReport } from "./seoHealth";

beforeEach(async () => {
  await resetTestDb();
  await query("TRUNCATE TABLE seo_health_runs RESTART IDENTITY;");
});

function report(canonicalOk: boolean): SeoHealthReport {
  const html = `<title>T</title><meta name="description" content="d"><link rel="canonical" href="${canonicalOk ? "https://skycode.agency/a" : "https://skycode.agency/"}"><h1>x</h1>`;
  const pages = [auditParsedPage("https://skycode.agency/a", { status: 200, ttfbMs: 120, html })];
  return {
    baseUrl: "https://skycode.agency",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    pages,
    totals: summarizeReport(pages),
  };
}

describe("seo_health_runs", () => {
  it("guarda y lee la última corrida con su detalle por URL", async () => {
    await saveSeoHealthReport(report(false));
    const latest = await getLatestSeoHealthRun();
    expect(latest?.canonicalErrors).toBe(1);
    expect(latest?.results[0].issues[0].code).toBe("canonical_mismatch");
    expect(latest?.avgTtfbMs).toBe(120);
  });

  it("devuelve null sin corridas y el historial sin el detalle", async () => {
    expect(await getLatestSeoHealthRun()).toBeNull();
    await saveSeoHealthReport(report(true));
    await saveSeoHealthReport(report(false));
    const history = await getSeoHealthHistory();
    expect(history).toHaveLength(2);
    expect("results" in history[0]).toBe(false);
  });

  it("conserva solo las últimas 60 corridas", async () => {
    await createTestUser({ role: "admin" });
    for (let i = 0; i < 62; i++) await saveSeoHealthReport(report(true));
    const count = await query("SELECT count(*)::int AS n FROM seo_health_runs;");
    expect(count.rows[0].n).toBe(60);
  });
});
