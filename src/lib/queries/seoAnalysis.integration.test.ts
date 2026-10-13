import { beforeEach, describe, expect, it } from "vitest";
import { createTestUser, resetTestDb } from "../testHelpers/db";
import { query } from "../db";
import { upsertGscMetrics } from "./seoMetrics";
import type { GscRow } from "../googleSearchConsole";
import { todayBogota } from "../dateOnly";
import { getOpenSeoAlerts, loadSeoWindows, runSeoAnalysis, syncSeoAlerts, SEO_ALERT_KINDS } from "./seoAnalysis";

beforeEach(async () => {
  await resetTestDb();
});

const SITE = "https://skycode.agency";
const GUIDE = `${SITE}/blog/migracion-sistemas-legados-sin-interrupcion`;
const SERVICE = `${SITE}/servicios/migracion-datos-legacy`;
const Q = "servicios de migracion de sistemas legacy";

function gsc(date: string, page: string, q: string, impressions: number, position: number, clicks = 0): GscRow {
  return { date, page, query: q, clicks, impressions, ctr: 0, position };
}

/** Siete días consecutivos terminando en `end` (`YYYY-MM-DD`). */
function week(end: string, build: (date: string) => GscRow[]): GscRow[] {
  const rows: GscRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    rows.push(...build(d.toISOString().slice(0, 10)));
  }
  return rows;
}

describe("loadSeoWindows", () => {
  it("es null sin datos y mide las dos ventanas desde la última fecha con datos (no desde hoy)", async () => {
    expect(await loadSeoWindows()).toBeNull();
    await upsertGscMetrics([
      ...week("2026-09-14", (d) => [gsc(d, SERVICE, "a", 2, 20)]),
      ...week("2026-09-07", (d) => [gsc(d, SERVICE, "a", 1, 30)]),
    ]);
    const w = (await loadSeoWindows())!;
    expect(w.latestDate).toBe("2026-09-14");
    expect(w.current).toMatchObject({ from: "2026-09-08", to: "2026-09-14" });
    expect(w.previous).toMatchObject({ from: "2026-09-01", to: "2026-09-07" });
    expect(w.current.rows[0]).toMatchObject({ impressions: 14, position: 20 });
    expect(w.previous.rows[0]).toMatchObject({ impressions: 7, position: 30 });
  });
});

describe("syncSeoAlerts", () => {
  const draft = (dedupeKey: string, kind: "wrong_target" | "top10_entry" = "wrong_target") => ({
    kind,
    severity: "warning" as const,
    dedupeKey,
    title: `t ${dedupeKey}`,
    detail: "d",
    data: { k: dedupeKey },
  });

  it("abre una vez, refresca sin duplicar y cierra cuando la condición desaparece", async () => {
    const first = await syncSeoAlerts([draft("a"), draft("b")], SEO_ALERT_KINDS);
    expect(first.created.map((a) => a.dedupeKey).sort()).toEqual(["a", "b"]);

    const second = await syncSeoAlerts([draft("a")], SEO_ALERT_KINDS);
    expect(second.created).toHaveLength(0); // "a" ya estaba abierta: no se vuelve a avisar
    expect(second.resolved).toBe(1); // "b" dejó de cumplirse
    expect((await getOpenSeoAlerts()).map((a) => a.dedupeKey)).toEqual(["a"]);

    const third = await syncSeoAlerts([draft("a"), draft("b")], SEO_ALERT_KINDS);
    expect(third.created.map((a) => a.dedupeKey)).toEqual(["b"]); // "b" reaparece → alerta nueva
  });

  it("no cierra los tipos que esta corrida no evaluó ni una alerta de top 10 recién abierta", async () => {
    await syncSeoAlerts([draft("t", "top10_entry"), draft("w")], SEO_ALERT_KINDS);
    await syncSeoAlerts([], ["wrong_target"]);
    expect((await getOpenSeoAlerts()).map((a) => a.dedupeKey)).toEqual(["t"].sort());
    await syncSeoAlerts([], SEO_ALERT_KINDS); // top 10: sigue visible 14 días aunque ya no cumpla
    expect((await getOpenSeoAlerts()).map((a) => a.dedupeKey)).toEqual(["t"]);
    await query(`UPDATE seo_alerts SET first_seen_at = now() - interval '20 days' WHERE kind = 'top10_entry';`);
    await syncSeoAlerts([], SEO_ALERT_KINDS);
    expect(await getOpenSeoAlerts()).toHaveLength(0);
  });
});

describe("runSeoAnalysis", () => {
  it("detecta canibalización y página equivocada con los datos del diagnóstico y avisa UNA vez a los admins", async () => {
    const admin = await createTestUser({ role: "admin" });
    await upsertGscMetrics([
      ...week("2026-09-14", (d) => [gsc(d, GUIDE, Q, 11, 79.9), gsc(d, SERVICE, Q, 9, 33.2)]),
      ...week("2026-09-07", (d) => [gsc(d, GUIDE, Q, 11, 79.9), gsc(d, SERVICE, Q, 9, 33.2)]),
    ]);

    const run = await runSeoAnalysis();
    expect(run.latestDate).toBe("2026-09-14");
    expect(run.created).toBe(2); // cannibalization + wrong_target
    const open = await getOpenSeoAlerts();
    expect(open.map((a) => a.kind).sort()).toEqual(["cannibalization", "wrong_target"]);
    expect(open.every((a) => a.notifiedAt !== null)).toBe(true);

    const notifications = await query(`SELECT type, link FROM notifications WHERE user_id = $1;`, [admin.id]);
    expect(notifications.rows).toHaveLength(2);
    expect(notifications.rows[0]).toMatchObject({ type: "seo_alert", link: "/dashboard/seo" });

    // Segunda corrida con los mismos datos: no se abre nada nuevo ni se vuelve a avisar.
    const again = await runSeoAnalysis();
    expect(again.created).toBe(0);
    expect((await query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1;`, [admin.id])).rows[0].n).toBe(2);
  });

  it("registra la entrada al top 10 y la caída de una página con la semana anterior como referencia", async () => {
    await upsertGscMetrics([
      ...week("2026-09-14", (d) => [gsc(d, `${SITE}/fr/services/migration-systemes-legacy`, "migration système legacy", 2, 8), gsc(d, `${SITE}/servicios/apis-integraciones`, "integracion apis", 2, 40)]),
      ...week("2026-09-07", (d) => [gsc(d, `${SITE}/fr/services/migration-systemes-legacy`, "migration système legacy", 2, 16), gsc(d, `${SITE}/servicios/apis-integraciones`, "integracion apis", 2, 12)]),
    ]);
    await runSeoAnalysis();
    const kinds = (await getOpenSeoAlerts()).map((a) => a.kind).sort();
    expect(kinds).toEqual(["page_drop", "top10_entry"]);
  });

  it("sin datos de Search Console no falla y solo evalúa las URLs caídas de la última auditoría", async () => {
    const run = await runSeoAnalysis();
    expect(run).toMatchObject({ latestDate: null, created: 0, alertsOpen: 0 });
  });
});

describe("vigilancia tras un cambio de título (seo_watches)", () => {
  const FR = `${SITE}/fr/blog/migration-systeme-legacy-sans-interruption`;
  const QUERY = "migration système legacy";
  const shift = (days: number) => {
    const d = new Date(`${todayBogota()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  async function watch(changedAtOffset: number, watchDays = 14) {
    const r = await query(
      `INSERT INTO seo_watches (query, label, changed_at, watch_until, baseline_position, baseline_impressions, alert_above_position)
       VALUES ($1, 'Título de /fr/blog', $2::date, $2::date + $3::int, 10.2, 5, 15) RETURNING id;`,
      [QUERY, shift(changedAtOffset), watchDays]
    );
    return Number(r.rows[0].id);
  }

  it("avisa si la posición medida después del cambio queda peor que 15, una sola vez, y se cierra al recuperarse", async () => {
    const id = await watch(-3);
    // Antes del cambio: posición ~10 (no cuenta). Después: 18.
    await upsertGscMetrics([gsc(shift(-5), FR, QUERY, 5, 10), gsc(shift(-1), FR, QUERY, 3, 18)]);

    const first = await runSeoAnalysis();
    expect(first.created).toBe(1);
    const [alert] = (await getOpenSeoAlerts()).filter((a) => a.kind === "watch_drop");
    expect(alert).toMatchObject({ kind: "watch_drop", dedupeKey: `watch:${id}` });
    expect(alert.title).toContain("18.0");

    expect((await runSeoAnalysis()).created).toBe(0); // no se repite el aviso

    // Mejora (datos posteriores con mejor posición): la media ponderada vuelve a ≤15 y la alerta se cierra.
    await upsertGscMetrics([gsc(shift(0), FR, QUERY, 30, 8)]);
    await runSeoAnalysis();
    expect((await getOpenSeoAlerts()).filter((a) => a.kind === "watch_drop")).toHaveLength(0);
    const watchRow = await query(`SELECT last_position::float AS p, last_impressions FROM seo_watches WHERE id = $1;`, [id]);
    expect(watchRow.rows[0].last_impressions).toBe(33);
  });

  it("no avisa sin datos posteriores al cambio ni cuando la ventana de dos semanas ya terminó", async () => {
    await watch(-3);
    await upsertGscMetrics([gsc(shift(-5), FR, QUERY, 5, 30)]); // solo datos ANTERIORES al cambio
    expect((await runSeoAnalysis()).created).toBe(0);

    await resetTestDb();
    await watch(-20); // cambio hace 20 días: la vigilancia terminó hace 6
    await upsertGscMetrics([gsc(shift(-1), FR, QUERY, 5, 30)]);
    expect((await runSeoAnalysis()).created).toBe(0);
  });
});
