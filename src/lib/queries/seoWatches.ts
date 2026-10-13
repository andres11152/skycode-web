import { query } from "../db";
import type { SeoWatch, WatchAfter } from "../seoAnalysis";

// Vigilancias de posición tras un cambio de título (tabla `seo_watches`, migración 0046). El registro de una
// vigilancia lo hace `scripts/seo-register-watch.mjs`; aquí solo se leen y se mide lo ocurrido después del cambio.

const toNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Vigilancias cuya ventana aún no terminó (`today` = fecha de Bogotá, `YYYY-MM-DD`). */
export async function getActiveSeoWatches(today: string): Promise<SeoWatch[]> {
  const res = await query(
    `SELECT id, query, label, changed_at::text AS changed_at, watch_until::text AS watch_until,
            baseline_position, baseline_impressions, alert_above_position
     FROM seo_watches WHERE watch_until >= $1::date ORDER BY id;`,
    [today]
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    query: String(row.query),
    label: String(row.label ?? ""),
    changedAt: String(row.changed_at),
    watchUntil: String(row.watch_until),
    baselinePosition: toNum(row.baseline_position),
    baselineImpressions: Number(row.baseline_impressions),
    alertAbovePosition: Number(row.alert_above_position),
  }));
}

/** Impresiones y posición media (ponderada) de la búsqueda en todas las páginas, solo con fechas POSTERIORES al cambio. */
export async function getWatchAfter(watch: SeoWatch): Promise<WatchAfter | null> {
  const res = await query(
    `SELECT COALESCE(SUM(impressions), 0)::int AS impressions,
            COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 0)::float AS position
     FROM gsc_metrics WHERE lower(query) = lower($1) AND date > $2::date;`,
    [watch.query, watch.changedAt]
  );
  const row = res.rows[0];
  return row && Number(row.impressions) > 0 ? { impressions: Number(row.impressions), position: Number(row.position) } : null;
}

/** Deja constancia de la última medición (para el panel y para saber que la vigilancia está corriendo). */
export async function recordWatchCheck(id: number, after: WatchAfter | null): Promise<void> {
  await query(`UPDATE seo_watches SET last_checked_at = now(), last_position = $2, last_impressions = $3 WHERE id = $1;`, [
    id,
    after?.position ?? null,
    after?.impressions ?? null,
  ]);
}
