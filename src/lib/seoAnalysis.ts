import { containsKeyword, normalizeForMatch, type FlatKeywordEntry } from "@/seo/keyword-map";

// Análisis de Search Console: funciones PURAS sobre filas ya agregadas por (query, página) de un periodo.
// Las consume el cron (alertas), el panel `/dashboard/seo` y los tests; la lectura de `gsc_metrics` vive en
// `lib/queries/seoAnalysis.ts`. Nada aquí toca la base ni la red.
//
// Convenciones:
//   - `position` de una fila es la posición media del periodo PONDERADA por impresiones (como la que muestra
//     Search Console); al combinar filas se vuelve a ponderar, nunca se promedian posiciones a secas.
//   - Marca = la query contiene "sky code" o "skycode" (con o sin espacio). Todo lo demás es no-marca. Las
//     queries de marca se excluyen de canibalización y de páginas equivocadas: que la home, el equipo y los
//     servicios aparezcan juntos para "skycode" es lo esperado (enlaces de sitio), no un conflicto.

/** Marca: "skycode" o "sky code", en cualquier combinación de mayúsculas. */
export const BRAND_PATTERN = /sky\s?code/i;

export function isBrandQuery(query: string): boolean {
  return BRAND_PATTERN.test(query);
}

export interface PeriodRow {
  query: string;
  /** URL absoluta tal como la devuelve Search Console. */
  page: string;
  clicks: number;
  impressions: number;
  /** Posición media del periodo, ponderada por impresiones. */
  position: number;
}

export interface Totals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queries: number;
}

function weightedPosition(rows: { impressions: number; position: number }[]): number {
  const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  if (impressions === 0) return 0;
  return rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / impressions;
}

function totalsOf(rows: PeriodRow[]): Totals {
  const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: weightedPosition(rows),
    queries: new Set(rows.map((r) => r.query)).size,
  };
}

/** Marca vs no-marca: clics, impresiones, CTR y posición de cada segmento. */
export function segmentTotals(rows: PeriodRow[]): { brand: Totals; nonBrand: Totals } {
  return {
    brand: totalsOf(rows.filter((r) => isBrandQuery(r.query))),
    nonBrand: totalsOf(rows.filter((r) => !isBrandQuery(r.query))),
  };
}

// ── Agregación ──────────────────────────────────────────────────────────────────────────────────

export interface QueryAggregate {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  isBrand: boolean;
  /** Páginas que recibieron impresiones para la query, la más vista primero. */
  pages: PeriodRow[];
}

export function aggregateByQuery(rows: PeriodRow[]): Map<string, QueryAggregate> {
  const byQuery = new Map<string, PeriodRow[]>();
  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    byQuery.set(key, [...(byQuery.get(key) ?? []), row]);
  }
  return new Map(
    [...byQuery].map(([query, group]) => [
      query,
      {
        query,
        clicks: group.reduce((sum, r) => sum + r.clicks, 0),
        impressions: group.reduce((sum, r) => sum + r.impressions, 0),
        position: weightedPosition(group),
        isBrand: isBrandQuery(query),
        pages: [...group].sort((a, b) => b.impressions - a.impressions),
      },
    ])
  );
}

export interface PageAggregate {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

export function aggregateByPage(rows: PeriodRow[]): Map<string, PageAggregate> {
  const byPage = new Map<string, PeriodRow[]>();
  for (const row of rows) byPage.set(row.page, [...(byPage.get(row.page) ?? []), row]);
  return new Map(
    [...byPage].map(([page, group]) => [
      page,
      {
        page,
        clicks: group.reduce((sum, r) => sum + r.clicks, 0),
        impressions: group.reduce((sum, r) => sum + r.impressions, 0),
        position: weightedPosition(group),
      },
    ])
  );
}

/** Ruta (sin dominio ni barra final) de una URL absoluta; la raíz es "/". */
export function pathOfPage(page: string): string {
  try {
    const { pathname } = new URL(page);
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  } catch {
    return page;
  }
}

/** Idioma de una URL por su prefijo (`/en`, `/fr`); sin prefijo, español. */
export function localeOfPage(page: string): "es" | "en" | "fr" {
  const path = pathOfPage(page);
  if (path === "/en" || path.startsWith("/en/")) return "en";
  if (path === "/fr" || path.startsWith("/fr/")) return "fr";
  return "es";
}

// ── Distancia de ataque ─────────────────────────────────────────────────────────────────────────

export interface StrikingDistanceOptions {
  minPosition?: number;
  maxPosition?: number;
  /** Impresiones mínimas del periodo para que valga la pena trabajarla. */
  minImpressions?: number;
}

export const STRIKING_DEFAULTS = { minPosition: 8, maxPosition: 20, minImpressions: 5 } as const;

export interface StrikingQuery {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  isBrand: boolean;
  /** Página que más impresiones recibe para esta query (la que habría que reforzar). */
  topPage: string;
}

/** Queries en posición 8–20 con impresiones suficientes: las más baratas de subir a la primera página. */
export function findStrikingDistance(rows: PeriodRow[], options: StrikingDistanceOptions = {}): StrikingQuery[] {
  const { minPosition, maxPosition, minImpressions } = { ...STRIKING_DEFAULTS, ...options };
  return [...aggregateByQuery(rows).values()]
    .filter((q) => q.position >= minPosition && q.position <= maxPosition && q.impressions >= minImpressions)
    .sort((a, b) => b.impressions - a.impressions)
    .map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, position: q.position, isBrand: q.isBrand, topPage: q.pages[0].page }));
}

// ── Canibalización ──────────────────────────────────────────────────────────────────────────────

export interface CannibalizationOptions {
  /** Impresiones mínimas que debe tener CADA página para contarla como competidora. */
  minPageImpressions?: number;
}

export interface Cannibalization {
  query: string;
  locale: "es" | "en" | "fr";
  pages: { page: string; impressions: number; clicks: number; position: number }[];
  totalImpressions: number;
}

/**
 * Queries para las que más de UNA URL del mismo idioma recibió impresiones en el periodo (las versiones en otro
 * idioma son alternativas hreflang, no competidoras). Excluye las de marca.
 */
export function findCannibalization(rows: PeriodRow[], options: CannibalizationOptions = {}): Cannibalization[] {
  const minPageImpressions = options.minPageImpressions ?? 1;
  const result: Cannibalization[] = [];
  for (const agg of aggregateByQuery(rows).values()) {
    if (agg.isBrand) continue;
    for (const locale of ["es", "en", "fr"] as const) {
      const pages = agg.pages
        .filter((p) => localeOfPage(p.page) === locale && p.impressions >= minPageImpressions)
        .map(({ page, impressions, clicks, position }) => ({ page, impressions, clicks, position }));
      if (new Set(pages.map((p) => p.page)).size > 1) {
        result.push({ query: agg.query, locale, pages, totalImpressions: pages.reduce((sum, p) => sum + p.impressions, 0) });
      }
    }
  }
  return result.sort((a, b) => b.totalImpressions - a.totalImpressions);
}

// ── Página equivocada (no es la que el mapa de keywords asigna) ─────────────────────────────────

export interface WrongTarget {
  query: string;
  cluster: string;
  /** Rutas que el mapa de keywords asigna a ese clúster (una por idioma). */
  expectedPaths: string[];
  actualPath: string;
  impressions: number;
  position: number;
}

/** Clúster dueño de una query: gana la keyword PRIMARIA, y entre varias la más larga (la más específica). */
export function matchCluster(query: string, entries: readonly FlatKeywordEntry[]): string | null {
  let best: { cluster: string; weight: number } | null = null;
  for (const entry of entries) {
    if (entry.cluster === "brand") continue;
    const candidates: [string, number][] = [
      [entry.primaryKeyword, 1000],
      ...entry.secondaryKeywords.map((kw): [string, number] => [kw, 0]),
    ];
    for (const [keyword, bonus] of candidates) {
      if (!containsKeyword(query, keyword)) continue;
      const weight = bonus + normalizeForMatch(keyword).length;
      if (!best || weight > best.weight) best = { cluster: entry.cluster, weight };
    }
  }
  return best?.cluster ?? null;
}

/**
 * Queries cuya página más vista NO es una de las asignadas a su clúster en el mapa de keywords: p. ej. una
 * búsqueda comercial que rankea la guía del blog en vez del servicio (el caso que motivó el mapa).
 */
export function findWrongTarget(rows: PeriodRow[], entries: readonly FlatKeywordEntry[], options: { minImpressions?: number } = {}): WrongTarget[] {
  const minImpressions = options.minImpressions ?? 1;
  const result: WrongTarget[] = [];
  for (const agg of aggregateByQuery(rows).values()) {
    if (agg.isBrand || agg.impressions < minImpressions) continue;
    const cluster = matchCluster(agg.query, entries);
    if (!cluster) continue;
    const expectedPaths = entries.filter((e) => e.cluster === cluster).map((e) => e.targetPath);
    const top = agg.pages[0];
    const actualPath = pathOfPage(top.page);
    if (expectedPaths.includes(actualPath)) continue;
    result.push({ query: agg.query, cluster, expectedPaths, actualPath, impressions: agg.impressions, position: agg.position });
  }
  return result.sort((a, b) => b.impressions - a.impressions);
}

// ── Semana contra semana ────────────────────────────────────────────────────────────────────────

export interface QueryDelta {
  query: string;
  impressions: number;
  previousImpressions: number;
  clicks: number;
  position: number;
  /** `null` si la query no tuvo impresiones el periodo anterior. */
  previousPosition: number | null;
  /** Posición actual − anterior: NEGATIVO = mejoró (subió en el ranking). `null` si no hay periodo anterior. */
  positionDelta: number | null;
  isBrand: boolean;
}

export function compareByQuery(current: PeriodRow[], previous: PeriodRow[]): QueryDelta[] {
  const before = aggregateByQuery(previous);
  return [...aggregateByQuery(current).values()]
    .map((q) => {
      const prev = before.get(q.query);
      return {
        query: q.query,
        impressions: q.impressions,
        previousImpressions: prev?.impressions ?? 0,
        clicks: q.clicks,
        position: q.position,
        previousPosition: prev ? prev.position : null,
        positionDelta: prev ? q.position - prev.position : null,
        isBrand: q.isBrand,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

export interface PageDelta {
  page: string;
  impressions: number;
  previousImpressions: number;
  clicks: number;
  position: number;
  previousPosition: number | null;
  positionDelta: number | null;
}

export function compareByPage(current: PeriodRow[], previous: PeriodRow[]): PageDelta[] {
  const before = aggregateByPage(previous);
  return [...aggregateByPage(current).values()]
    .map((p) => {
      const prev = before.get(p.page);
      return {
        page: p.page,
        impressions: p.impressions,
        previousImpressions: prev?.impressions ?? 0,
        clicks: p.clicks,
        position: p.position,
        previousPosition: prev ? prev.position : null,
        positionDelta: prev ? p.position - prev.position : null,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);
}

// ── Alertas ─────────────────────────────────────────────────────────────────────────────────────

export type SeoAlertKind = "top10_entry" | "page_drop" | "cannibalization" | "wrong_target" | "url_not_ok";
export type SeoAlertSeverity = "info" | "warning" | "critical";

export interface SeoAlertDraft {
  kind: SeoAlertKind;
  severity: SeoAlertSeverity;
  /** Identifica el mismo problema entre corridas (no se avisa dos veces mientras siga abierto). */
  dedupeKey: string;
  title: string;
  detail: string;
  data: Record<string, unknown>;
}

export const ALERT_THRESHOLDS = {
  /** Una query "entra al top 10" si su posición media pasa a ≤ esto... */
  top10: 10,
  /** ...con al menos estas impresiones en la ventana actual. */
  minImpressions: 3,
  /** Una página "cae" si su posición media empeora más de esto. */
  pageDropPositions: 10,
} as const;

const shortPath = (page: string) => pathOfPage(page);
const fixed = (n: number) => n.toFixed(1);

export interface BuildAlertsInput {
  current: PeriodRow[];
  previous: PeriodRow[];
  entries: readonly FlatKeywordEntry[];
  /** URLs del sitemap que no respondieron 200 en la última auditoría de salud técnica. */
  nonOkUrls?: { url: string; status: number | null }[];
}

export function buildSeoAlerts({ current, previous, entries, nonOkUrls = [] }: BuildAlertsInput): SeoAlertDraft[] {
  const alerts: SeoAlertDraft[] = [];

  // 1) Una query entra al top 10.
  for (const delta of compareByQuery(current, previous)) {
    if (delta.impressions < ALERT_THRESHOLDS.minImpressions) continue;
    const enteredTop10 = delta.position <= ALERT_THRESHOLDS.top10 && (delta.previousPosition === null || delta.previousPosition > ALERT_THRESHOLDS.top10);
    if (!enteredTop10) continue;
    alerts.push({
      kind: "top10_entry",
      severity: "info",
      dedupeKey: delta.query,
      title: `«${delta.query}» entró al top 10 (posición ${fixed(delta.position)})`,
      detail:
        delta.previousPosition === null
          ? "No tenía impresiones la semana anterior."
          : `La semana anterior estaba en la posición ${fixed(delta.previousPosition)}.`,
      data: { query: delta.query, position: delta.position, previousPosition: delta.previousPosition, impressions: delta.impressions },
    });
  }

  // 2) Una página cae más de 10 posiciones.
  for (const delta of compareByPage(current, previous)) {
    if (delta.positionDelta === null || delta.previousImpressions < ALERT_THRESHOLDS.minImpressions) continue;
    if (delta.positionDelta <= ALERT_THRESHOLDS.pageDropPositions) continue;
    alerts.push({
      kind: "page_drop",
      severity: "warning",
      dedupeKey: delta.page,
      title: `${shortPath(delta.page)} cayó ${fixed(delta.positionDelta)} posiciones`,
      detail: `Posición media ${fixed(delta.previousPosition ?? 0)} → ${fixed(delta.position)} respecto de la semana anterior.`,
      data: { page: delta.page, position: delta.position, previousPosition: delta.previousPosition, positionDelta: delta.positionDelta },
    });
  }

  // 3) Canibalización: más de una URL del mismo idioma para la misma query.
  for (const item of findCannibalization(current)) {
    alerts.push({
      kind: "cannibalization",
      severity: "warning",
      dedupeKey: `${item.locale}:${item.query}`,
      title: `Canibalización en «${item.query}»: ${item.pages.length} URLs`,
      detail: item.pages.map((p) => `${shortPath(p.page)} (${p.impressions} imp., pos. ${fixed(p.position)})`).join("; "),
      data: { query: item.query, locale: item.locale, pages: item.pages },
    });
  }

  // 4) La URL que rankea no es la que el mapa de keywords asigna.
  for (const item of findWrongTarget(current, entries)) {
    alerts.push({
      kind: "wrong_target",
      severity: "warning",
      dedupeKey: item.query,
      title: `«${item.query}» rankea ${item.actualPath} y no la página asignada`,
      detail: `El mapa de keywords asigna este clúster (${item.cluster}) a ${item.expectedPaths.join(", ")}.`,
      data: { query: item.query, cluster: item.cluster, expectedPaths: item.expectedPaths, actualPath: item.actualPath, impressions: item.impressions },
    });
  }

  // 5) Una URL del sitemap deja de responder 200.
  for (const { url, status } of nonOkUrls) {
    alerts.push({
      kind: "url_not_ok",
      severity: "critical",
      dedupeKey: url,
      title: `${shortPath(url)} no responde 200 (${status ?? "sin respuesta"})`,
      detail: "Está en el sitemap pero la última auditoría de salud técnica no pudo leerla.",
      data: { url, status },
    });
  }

  return alerts;
}
