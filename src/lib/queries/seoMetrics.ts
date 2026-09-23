import { query } from "../db";
import type { GscRow } from "../googleSearchConsole";

/** `/en/...` o `/fr/...` → ese locale; cualquier otra ruta → `es` (default, sin prefijo). */
function localeFromPage(page: string): "es" | "en" | "fr" {
  try {
    const path = new URL(page).pathname;
    if (path === "/en" || path.startsWith("/en/")) return "en";
    if (path === "/fr" || path.startsWith("/fr/")) return "fr";
  } catch {
    // page no es una URL válida (no debería pasar con datos reales de GSC) — cae a "es".
  }
  return "es";
}

/**
 * Upsert idempotente sobre `gsc_metrics` — usado por el cron
 * (`POST /api/cron/seo-pulse`), que re-consulta una ventana móvil de
 * varios días en cada corrida porque los datos de GSC llegan con 1-3 días
 * de retraso y pueden revisarse después. `ON CONFLICT` sobre la misma
 * clave única (date, page, query) reemplaza clicks/impresiones/ctr/posición
 * con el valor más reciente en vez de duplicar filas.
 *
 * Inserta en un solo `INSERT ... VALUES (...), (...), ...` (no una query
 * por fila) — un batch típico son unos cientos de filas, muy por debajo
 * del límite práctico de parámetros de Postgres.
 */
export async function upsertGscMetrics(rows: GscRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const values: string[] = [];
  const params: unknown[] = [];
  rows.forEach((row, i) => {
    const base = i * 8;
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
    );
    params.push(
      row.date,
      row.page,
      row.query,
      localeFromPage(row.page),
      row.clicks,
      row.impressions,
      row.ctr,
      row.position
    );
  });

  const res = await query(
    `INSERT INTO gsc_metrics (date, page, query, locale, clicks, impressions, ctr, position)
     VALUES ${values.join(", ")}
     ON CONFLICT (date, page, query) DO UPDATE SET
       clicks = EXCLUDED.clicks,
       impressions = EXCLUDED.impressions,
       ctr = EXCLUDED.ctr,
       position = EXCLUDED.position,
       fetched_at = now();`,
    params
  );
  return res.rowCount ?? 0;
}

export interface SeoSummary {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

/** Totales de los últimos `days` días, agregados sobre toda `gsc_metrics`. */
export async function getSeoSummary(days: number): Promise<SeoSummary> {
  const res = await query(
    `SELECT
       COALESCE(SUM(clicks), 0) AS total_clicks,
       COALESCE(SUM(impressions), 0) AS total_impressions,
       COALESCE(SUM(clicks)::numeric / NULLIF(SUM(impressions), 0), 0) AS avg_ctr,
       COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 0) AS avg_position
     FROM gsc_metrics
     WHERE date >= CURRENT_DATE - $1::int;`,
    [days]
  );
  const row = res.rows[0] ?? {};
  return {
    totalClicks: Number(row.total_clicks ?? 0),
    totalImpressions: Number(row.total_impressions ?? 0),
    avgCtr: Number(row.avg_ctr ?? 0),
    avgPosition: Number(row.avg_position ?? 0),
  };
}

export interface SeoQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Queries con más impresiones en los últimos `days` días, agregadas sobre todas sus páginas. */
export async function getTopQueries(days: number, limit: number): Promise<SeoQueryRow[]> {
  const res = await query(
    `SELECT
       query,
       SUM(clicks) AS clicks,
       SUM(impressions) AS impressions,
       SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) AS ctr,
       SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
     FROM gsc_metrics
     WHERE date >= CURRENT_DATE - $1::int
     GROUP BY query
     ORDER BY impressions DESC
     LIMIT $2;`,
    [days, limit]
  );
  return res.rows.map(shapeQueryRow);
}

/**
 * "Quick wins": queries que ya generan impresiones pero cero clics, en
 * posición 4-30 (fuera del top 3, donde el CTR es mucho más alto solo por
 * la posición) — son las candidatas más baratas para una pieza de
 * contenido nueva o un ajuste de metadata, exactamente el paso "detecta
 * gaps" del pipeline de la Fase 3 del plan de SEO.
 */
export async function getContentGaps(days: number, limit: number): Promise<SeoQueryRow[]> {
  const res = await query(
    `SELECT
       query,
       SUM(clicks) AS clicks,
       SUM(impressions) AS impressions,
       SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) AS ctr,
       SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
     FROM gsc_metrics
     WHERE date >= CURRENT_DATE - $1::int
     GROUP BY query
     HAVING SUM(clicks) = 0
        AND SUM(position * impressions) / NULLIF(SUM(impressions), 0) BETWEEN 4 AND 30
     ORDER BY impressions DESC
     LIMIT $2;`,
    [days, limit]
  );
  return res.rows.map(shapeQueryRow);
}

export interface SeoPageRow {
  page: string;
  locale: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Páginas con más clics en los últimos `days` días. */
export async function getTopPages(days: number, limit: number): Promise<SeoPageRow[]> {
  const res = await query(
    `SELECT
       page,
       MAX(locale) AS locale,
       SUM(clicks) AS clicks,
       SUM(impressions) AS impressions,
       SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) AS ctr,
       SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
     FROM gsc_metrics
     WHERE date >= CURRENT_DATE - $1::int
     GROUP BY page
     ORDER BY clicks DESC, impressions DESC
     LIMIT $2;`,
    [days, limit]
  );
  return res.rows.map((row) => ({
    page: String(row.page ?? ""),
    locale: String(row.locale ?? "es"),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
}

/** `true` si el cron ya cargó al menos una fila alguna vez — distingue "sin datos todavía" de "cero tráfico real". */
export async function hasAnyGscData(): Promise<boolean> {
  const res = await query(`SELECT 1 FROM gsc_metrics LIMIT 1;`);
  return res.rows.length > 0;
}

function shapeQueryRow(row: Record<string, unknown>): SeoQueryRow {
  return {
    query: String(row.query ?? ""),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  };
}
