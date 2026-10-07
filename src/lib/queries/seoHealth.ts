import { query } from "../db";
import { logError } from "../logger";
import { runSeoHealthCheck, type SeoHealthReport, type SeoPageResult } from "../seoHealth";
import { createNotification } from "./notifications";

// Se conservan las últimas corridas: con una diaria son ~2 meses de tendencia,
// suficiente para ver cuándo empezó un problema sin crecer sin límite.
const RETENTION_RUNS = 60;

export interface SeoHealthRunSummary {
  id: number;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  totalPages: number;
  pagesWithErrors: number;
  canonicalErrors: number;
  duplicateTitles: number;
  missingH1: number;
  nonOkStatus: number;
  avgTtfbMs: number | null;
  maxTtfbMs: number | null;
}

export interface SeoHealthRun extends SeoHealthRunSummary {
  results: SeoPageResult[];
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function shapeSummary(row: Record<string, unknown>): SeoHealthRunSummary {
  return {
    id: Number(row.id),
    baseUrl: String(row.base_url),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    totalPages: Number(row.total_pages),
    pagesWithErrors: Number(row.pages_with_errors),
    canonicalErrors: Number(row.canonical_errors),
    duplicateTitles: Number(row.duplicate_titles),
    missingH1: Number(row.missing_h1),
    nonOkStatus: Number(row.non_ok_status),
    avgTtfbMs: row.avg_ttfb_ms === null ? null : Number(row.avg_ttfb_ms),
    maxTtfbMs: row.max_ttfb_ms === null ? null : Number(row.max_ttfb_ms),
  };
}

export async function saveSeoHealthReport(report: SeoHealthReport): Promise<number> {
  const t = report.totals;
  const res = await query(
    `INSERT INTO seo_health_runs
       (base_url, started_at, finished_at, total_pages, pages_with_errors, canonical_errors,
        duplicate_titles, missing_h1, non_ok_status, avg_ttfb_ms, max_ttfb_ms, results)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
     RETURNING id;`,
    [
      report.baseUrl,
      report.startedAt,
      report.finishedAt,
      t.pages,
      t.withErrors,
      t.canonicalErrors,
      t.duplicateTitles,
      t.missingH1,
      t.nonOkStatus,
      t.avgTtfbMs,
      t.maxTtfbMs,
      JSON.stringify(report.pages),
    ]
  );
  await query(
    `DELETE FROM seo_health_runs
     WHERE id NOT IN (SELECT id FROM seo_health_runs ORDER BY started_at DESC, id DESC LIMIT $1);`,
    [RETENTION_RUNS]
  );
  return Number(res.rows[0].id);
}

export async function getLatestSeoHealthRun(): Promise<SeoHealthRun | null> {
  const res = await query(`SELECT * FROM seo_health_runs ORDER BY started_at DESC, id DESC LIMIT 1;`);
  if (res.rows.length === 0) return null;
  return { ...shapeSummary(res.rows[0]), results: (res.rows[0].results ?? []) as SeoPageResult[] };
}

/** Resúmenes de las últimas corridas (sin el detalle por URL), de la más reciente a la más antigua. */
export async function getSeoHealthHistory(limit = 14): Promise<SeoHealthRunSummary[]> {
  const res = await query(
    `SELECT id, base_url, started_at, finished_at, total_pages, pages_with_errors, canonical_errors,
            duplicate_titles, missing_h1, non_ok_status, avg_ttfb_ms, max_ttfb_ms
     FROM seo_health_runs ORDER BY started_at DESC, id DESC LIMIT $1;`,
    [limit]
  );
  return res.rows.map(shapeSummary);
}

/**
 * Avisa a los administradores (campanita + push) cuando aparece un canonical
 * incorrecto que la corrida anterior no tenía: es el síntoma del bug que
 * motivó este monitoreo (páginas diciendo ser duplicado de la home). Solo en
 * el paso de "sin error" a "con error" y mientras el número empeore — no
 * repite el aviso cada día mientras siga igual de roto.
 */
async function notifyCanonicalRegression(report: SeoHealthReport, previousCanonicalErrors: number | null): Promise<void> {
  const current = report.totals.canonicalErrors;
  if (current === 0 || (previousCanonicalErrors !== null && current <= previousCanonicalErrors)) return;

  const admins = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active';`);
  const sample = report.pages
    .filter((p) => p.issues.some((i) => i.code === "canonical_mismatch" || i.code === "canonical_missing"))
    .slice(0, 3)
    .map((p) => p.url.replace(/^https?:\/\/[^/]+/, "") || "/")
    .join(", ");
  for (const row of admins.rows) {
    try {
      await createNotification({
        userId: Number(row.id),
        type: "seo_canonical",
        title: `SEO: ${current} página(s) con canonical incorrecto`,
        body: `Google podría tratarlas como duplicados de otra URL. Ejemplos: ${sample}.`,
        link: "/dashboard/seo",
      });
    } catch (error) {
      logError("❌ [SEO Health] no se pudo notificar a un admin", error);
    }
  }
}

/** URL pública que se audita: la de producción, salvo que se fije otra (p. ej. un staging) con `SEO_HEALTH_BASE_URL`. */
export function getSeoHealthBaseUrl(): string {
  return (process.env.SEO_HEALTH_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://skycode.agency").replace(/\/+$/, "");
}

/** Audita el sitio publicado, guarda el resultado y avisa si hay una regresión de canonical. */
export async function runAndStoreSeoHealth(): Promise<{ runId: number; report: SeoHealthReport }> {
  const previous = await getLatestSeoHealthRun();
  const report = await runSeoHealthCheck({ baseUrl: getSeoHealthBaseUrl() });
  const runId = await saveSeoHealthReport(report);
  await notifyCanonicalRegression(report, previous ? previous.canonicalErrors : null);
  return { runId, report };
}
