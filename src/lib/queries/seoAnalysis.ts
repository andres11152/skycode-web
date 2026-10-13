import { query } from "../db";
import { logError } from "../logger";
import { listKeywordEntries } from "../../seo/keyword-map";
import { buildSeoAlerts, buildWatchAlert, type PeriodRow, type SeoAlertDraft, type SeoAlertKind, type SeoAlertSeverity } from "../seoAnalysis";
import { getLatestSeoHealthRun } from "./seoHealth";
import { createNotification } from "./notifications";
import { getActiveSeoWatches, getWatchAfter, recordWatchCheck } from "./seoWatches";
import { todayBogota } from "../dateOnly";

// Lectura de `gsc_metrics` por ventanas de una semana y registro de alertas en `seo_alerts`. La lógica de
// análisis (qué es canibalización, caída, top 10…) es pura y vive en `lib/seoAnalysis.ts`.

const WINDOW_DAYS = 7;

/** Una alerta de top 10 sigue visible este tiempo aunque la query ya no cumpla: es una noticia, no un problema. */
const TOP10_VISIBLE_DAYS = 14;

const toIso = (value: unknown): string => (value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString());

/** Fecha más reciente con datos de Search Console (`YYYY-MM-DD`), o `null` si no hay ninguna. */
export async function getLatestGscDate(): Promise<string | null> {
  const res = await query(`SELECT max(date)::text AS latest FROM gsc_metrics;`);
  return res.rows[0]?.latest ? String(res.rows[0].latest) : null;
}

/** Filas agregadas por (query, página) de un rango de fechas INCLUSIVO, con la posición ponderada por impresiones. */
export async function getPeriodRows(from: string, to: string): Promise<PeriodRow[]> {
  const res = await query(
    `SELECT query, page,
            SUM(clicks)::int AS clicks,
            SUM(impressions)::int AS impressions,
            COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 0)::float AS position
     FROM gsc_metrics
     WHERE date BETWEEN $1::date AND $2::date
     GROUP BY query, page
     HAVING SUM(impressions) > 0;`,
    [from, to]
  );
  return res.rows.map((row) => ({
    query: String(row.query),
    page: String(row.page),
    clicks: Number(row.clicks),
    impressions: Number(row.impressions),
    position: Number(row.position),
  }));
}

/** `date` + `days` días (`YYYY-MM-DD`), en UTC: las fechas de Search Console son calendario, sin hora. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface SeoWindows {
  /** Última fecha con datos; las dos ventanas se miden desde ella, no desde "hoy" (Search Console llega con 1–3 días de retraso). */
  latestDate: string;
  current: { from: string; to: string; rows: PeriodRow[] };
  previous: { from: string; to: string; rows: PeriodRow[] };
}

/** Semana en curso (los 7 días que terminan en la última fecha con datos) y la anterior. `null` si aún no hay datos. */
export async function loadSeoWindows(): Promise<SeoWindows | null> {
  const latestDate = await getLatestGscDate();
  if (!latestDate) return null;
  const currentFrom = shiftDate(latestDate, -(WINDOW_DAYS - 1));
  const previousTo = shiftDate(currentFrom, -1);
  const previousFrom = shiftDate(previousTo, -(WINDOW_DAYS - 1));
  const [current, previous] = await Promise.all([getPeriodRows(currentFrom, latestDate), getPeriodRows(previousFrom, previousTo)]);
  return {
    latestDate,
    current: { from: currentFrom, to: latestDate, rows: current },
    previous: { from: previousFrom, to: previousTo, rows: previous },
  };
}

// ── Alertas ─────────────────────────────────────────────────────────────────────────────────────

export interface SeoAlert {
  id: number;
  kind: SeoAlertKind;
  severity: SeoAlertSeverity;
  dedupeKey: string;
  title: string;
  detail: string;
  data: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  notifiedAt: string | null;
}

function shapeAlert(row: Record<string, unknown>): SeoAlert {
  return {
    id: Number(row.id),
    kind: row.kind as SeoAlertKind,
    severity: row.severity as SeoAlertSeverity,
    dedupeKey: String(row.dedupe_key),
    title: String(row.title),
    detail: String(row.detail ?? ""),
    data: (row.data ?? {}) as Record<string, unknown>,
    firstSeenAt: toIso(row.first_seen_at),
    lastSeenAt: toIso(row.last_seen_at),
    resolvedAt: row.resolved_at ? toIso(row.resolved_at) : null,
    notifiedAt: row.notified_at ? toIso(row.notified_at) : null,
  };
}

/** Alertas abiertas, las más graves primero. */
export async function getOpenSeoAlerts(limit = 50): Promise<SeoAlert[]> {
  const res = await query(
    `SELECT * FROM seo_alerts
     WHERE resolved_at IS NULL
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, first_seen_at DESC
     LIMIT $1;`,
    [limit]
  );
  return res.rows.map(shapeAlert);
}

export interface SyncResult {
  /** Alertas que NO estaban abiertas y aparecen ahora (las que se avisan). */
  created: SeoAlert[];
  /** Alertas que seguían abiertas y ya no se cumplen. */
  resolved: number;
}

/**
 * Deja la tabla igual al conjunto de `drafts`: abre las nuevas, refresca las que siguen y cierra las que ya no se
 * cumplen. `kinds` acota qué tipos evalúa esta corrida (una alerta de un tipo que no se evaluó no se cierra).
 * Las de top 10 no se cierran al instante: se quedan visibles `TOP10_VISIBLE_DAYS` días.
 */
export async function syncSeoAlerts(drafts: SeoAlertDraft[], kinds: readonly SeoAlertKind[]): Promise<SyncResult> {
  const created: SeoAlert[] = [];

  for (const draft of drafts) {
    const res = await query(
      `INSERT INTO seo_alerts (kind, severity, dedupe_key, title, detail, data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (kind, dedupe_key) WHERE resolved_at IS NULL
       DO UPDATE SET last_seen_at = now(), severity = EXCLUDED.severity, title = EXCLUDED.title,
                     detail = EXCLUDED.detail, data = EXCLUDED.data
       RETURNING *, (xmax = 0) AS inserted;`,
      [draft.kind, draft.severity, draft.dedupeKey, draft.title, draft.detail, JSON.stringify(draft.data)]
    );
    if (res.rows[0]?.inserted === true) created.push(shapeAlert(res.rows[0]));
  }

  const open = await query(
    `SELECT id, kind, dedupe_key, first_seen_at FROM seo_alerts WHERE resolved_at IS NULL AND kind = ANY($1::text[]);`,
    [[...kinds]]
  );
  const stillTrue = new Set(drafts.map((d) => `${d.kind}\u0000${d.dedupeKey}`));
  const staleTop10Before = Date.now() - TOP10_VISIBLE_DAYS * 24 * 3600 * 1000;
  const toResolve = open.rows
    .filter((row) => !stillTrue.has(`${row.kind}\u0000${row.dedupe_key}`))
    .filter((row) => row.kind !== "top10_entry" || new Date(row.first_seen_at).getTime() < staleTop10Before)
    .map((row) => Number(row.id));
  if (toResolve.length > 0) {
    await query(`UPDATE seo_alerts SET resolved_at = now() WHERE id = ANY($1::int[]);`, [toResolve]);
  }

  return { created, resolved: toResolve.length };
}

/** Avisa a los administradores (campanita + push) de las alertas nuevas y las marca como avisadas. */
export async function notifyAdminsOfSeoAlerts(created: SeoAlert[]): Promise<number> {
  if (created.length === 0) return 0;
  const admins = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active';`);
  let sent = 0;
  for (const alert of created) {
    for (const admin of admins.rows) {
      try {
        await createNotification({
          userId: Number(admin.id),
          type: "seo_alert",
          title: `SEO: ${alert.title}`,
          body: alert.detail,
          link: "/dashboard/seo",
        });
        sent += 1;
      } catch (error) {
        logError("❌ [SEO] no se pudo notificar una alerta a un admin", error);
      }
    }
    await query(`UPDATE seo_alerts SET notified_at = now() WHERE id = $1;`, [alert.id]);
  }
  return sent;
}

export const SEO_ALERT_KINDS: readonly SeoAlertKind[] = ["top10_entry", "page_drop", "cannibalization", "wrong_target", "url_not_ok", "watch_drop"];

export interface SeoAnalysisRun {
  /** Última fecha con datos de Search Console, o `null` si todavía no hay ninguno. */
  latestDate: string | null;
  alertsOpen: number;
  created: number;
  resolved: number;
  notified: number;
}

/**
 * Corrida completa que dispara `seo-pulse`: compara las dos últimas semanas, suma las URLs que la última
 * auditoría de salud técnica no pudo leer, sincroniza `seo_alerts` y avisa de lo nuevo. Sin datos de Search
 * Console aún, solo evalúa las URLs caídas. Sin `catch`: el cron la envuelve y la reporta.
 */
export async function runSeoAnalysis(): Promise<SeoAnalysisRun> {
  const windows = await loadSeoWindows();
  const health = await getLatestSeoHealthRun();
  const nonOkUrls = (health?.results ?? [])
    .filter((page) => page.status !== 200)
    .map((page) => ({ url: page.url, status: page.status }));

  // Sin datos de Search Console aún solo puede haber alertas de URLs caídas (salen de la auditoría propia).
  const drafts = buildSeoAlerts({
    current: windows?.current.rows ?? [],
    previous: windows?.previous.rows ?? [],
    entries: listKeywordEntries(),
    nonOkUrls,
  });

  // Vigilancias tras un cambio de título: miden lo ocurrido después del cambio, no las ventanas semanales.
  const today = todayBogota();
  for (const watch of await getActiveSeoWatches(today)) {
    const after = await getWatchAfter(watch);
    await recordWatchCheck(watch.id, after);
    const alert = buildWatchAlert(watch, after, today);
    if (alert) drafts.push(alert);
  }
  const kinds = windows ? SEO_ALERT_KINDS : (["url_not_ok", "watch_drop"] as const);

  const { created, resolved } = await syncSeoAlerts(drafts.filter((d) => kinds.includes(d.kind)), kinds);
  const notified = await notifyAdminsOfSeoAlerts(created);
  const open = await query(`SELECT count(*)::int AS n FROM seo_alerts WHERE resolved_at IS NULL;`);

  return { latestDate: windows?.latestDate ?? null, alertsOpen: Number(open.rows[0].n), created: created.length, resolved, notified };
}
