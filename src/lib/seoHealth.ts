// Auditoría técnica de SEO del sitio público: lee /sitemap.xml, pide cada URL
// y verifica canonical, título, descripción, H1 y status.
//
// Lo comparten DOS consumidores — por eso este archivo no importa nada del
// proyecto (ni alias `@/`, ni `pg`, ni Next) y usa solo sintaxis de TypeScript
// borrable (sin enums ni parameter properties):
//   - scripts/seo-check.ts (`npm run seo:check`), que Node ejecuta directo
//     quitando los tipos;
//   - el cron diario (lib/queries/seoHealth.ts → /api/cron/seo-pulse), que
//     guarda el resultado para /dashboard/seo.
// Una sola lógica evita que el panel diga "todo bien" mientras el script falla.
//
// Además de lo estructural (canonical, título, H1…), verifica contra el MAPA DE KEYWORDS
// (src/seo/keyword-map.ts): que la keyword primaria de cada página aparezca en su título y su H1, y que el
// hreflang del HTML coincida con el del sitemap (autorreferencia y x-default incluidos). El mapa también es
// un módulo sin imports del proyecto, por eso puede importarse desde aquí.
import { containsKeyword, type KeywordExpectation } from "../seo/keyword-map.ts";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_TIMEOUT_MS = 20_000;
const USER_AGENT = "SkyCodeSeoHealth/1.0 (+https://skycode.agency)";

export type SeoIssueCode =
  | "fetch_error"
  | "status"
  | "canonical_missing"
  | "canonical_mismatch"
  | "title_missing"
  | "title_duplicate"
  | "title_too_long"
  | "description_missing"
  | "description_too_long"
  | "h1_count"
  | "noindex_in_sitemap"
  | "todo_placeholder"
  | "keyword_primary_missing"
  | "hreflang_incomplete"
  | "h1_duplicate"
  | "img_missing_alt"
  | "lastmod_missing";

export interface SeoIssue {
  code: SeoIssueCode;
  /** `error` rompe el check; `warning` se muestra pero no lo hace fallar. */
  severity: "error" | "warning";
  message: string;
}

export interface SeoPageResult {
  /** URL tal como figura en el sitemap (la que Google debería tratar como canónica). */
  url: string;
  /** URL realmente pedida (distinta de `url` cuando se audita un entorno que no es producción). */
  fetchedUrl: string;
  status: number | null;
  ttfbMs: number | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1Count: number;
  h1Text: string | null;
  robots: string | null;
  issues: SeoIssue[];
}

export interface SeoHealthReport {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  pages: SeoPageResult[];
  totals: {
    pages: number;
    withErrors: number;
    errors: number;
    warnings: number;
    canonicalErrors: number;
    duplicateTitles: number;
    missingH1: number;
    nonOkStatus: number;
    avgTtfbMs: number | null;
    maxTtfbMs: number | null;
  };
}

export interface ParsedHtml {
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1Count: number;
  /** Texto del primer H1 visible (sin etiquetas), útil para auditar el titular. */
  h1Text: string | null;
  /** `<img>` sin atributo `alt` (un `alt=""` decorativo SÍ cuenta como declarado). */
  imagesWithoutAlt: number;
  robots: string | null;
  /** `<link rel="alternate" hreflang>` declarados (idioma → URL tal como figura en el HTML). */
  hreflangs: { hreflang: string; href: string }[];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

/** Valor de un atributo dentro de una etiqueta ya aislada (soporta comillas simples y dobles). */
function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  if (!match) return null;
  return decodeEntities(match[2] ?? match[3] ?? "");
}

function findTags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

/**
 * Extrae lo que importa para SEO de un HTML. Sin dependencias a propósito:
 * un parser completo sería exagerado para cuatro etiquetas. Se descartan los
 * `<script>` antes de contar H1 (la carga RSC de Next trae texto con `<h1`
 * dentro de cadenas) y los `<template>` (fallbacks de Suspense).
 */
export function parseHtml(html: string): ParsedHtml {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<template\b[\s\S]*?<\/template>/gi, "");

  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(stripped);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : null;

  let description: string | null = null;
  let robots: string | null = null;
  for (const tag of findTags(stripped, "meta")) {
    const name = attr(tag, "name")?.toLowerCase();
    if (name === "description" && description === null) description = attr(tag, "content");
    if (name === "robots" && robots === null) robots = attr(tag, "content");
  }

  let canonical: string | null = null;
  for (const tag of findTags(stripped, "link")) {
    if (attr(tag, "rel")?.toLowerCase() === "canonical") {
      canonical = attr(tag, "href");
      break;
    }
  }

  // Solo los H1 visibles: un `hidden`/`aria-hidden` no es el encabezado de la página.
  const h1Count = findTags(stripped, "h1").filter((tag) => !/\shidden(\s|=|>|$)/i.test(tag)).length;
  const h1Match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(stripped);
  const h1Text = h1Match ? decodeEntities(h1Match[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() : null;

  const hreflangs: { hreflang: string; href: string }[] = [];
  for (const tag of findTags(stripped, "link")) {
    if (attr(tag, "rel")?.toLowerCase() !== "alternate") continue;
    const hreflang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    if (hreflang && href) hreflangs.push({ hreflang: hreflang.toLowerCase(), href });
  }

  return {
    hreflangs,
    title: title && title.length > 0 ? title : null,
    description: description && description.trim().length > 0 ? description.trim() : null,
    canonical: canonical && canonical.trim().length > 0 ? canonical.trim() : null,
    h1Count,
    h1Text: h1Text && h1Text.length > 0 ? h1Text : null,
    imagesWithoutAlt: findTags(stripped, "img").filter((tag) => attr(tag, "alt") === null).length,
    robots,
  };
}

/** Quita barra final y fragmento para comparar URLs sin falsos positivos ("/" vs ""). */
export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "";
    return `${url.origin}${path}${url.search}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function parseSitemapLocs(xml: string): string[] {
  const urls: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi)) {
    urls.push(decodeEntities(match[1]));
  }
  return urls;
}

/** Entradas del sitemap con su `<lastmod>` (o `null` si la URL no lo declara). */
export function parseSitemapEntries(xml: string): { loc: string; lastmod: string | null }[] {
  const entries: { loc: string; lastmod: string | null }[] = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/i.exec(block[1]);
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<\s][^<]*?)\s*<\/lastmod>/i.exec(block[1]);
    entries.push({ loc: decodeEntities(loc[1]), lastmod: lastmod ? lastmod[1] : null });
  }
  return entries;
}

/** Alternativas de idioma (`<xhtml:link rel="alternate" hreflang>`) que el sitemap declara para cada URL. */
export function parseSitemapAlternates(xml: string): Map<string, Record<string, string>> {
  const byLoc = new Map<string, Record<string, string>>();
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/i.exec(block[1]);
    if (!loc) continue;
    const alternates: Record<string, string> = {};
    for (const tag of block[1].matchAll(/<xhtml:link\b[^>]*>/gi)) {
      if (attr(tag[0], "rel")?.toLowerCase() !== "alternate") continue;
      const hreflang = attr(tag[0], "hreflang");
      const href = attr(tag[0], "href");
      if (hreflang && href) alternates[hreflang.toLowerCase()] = href;
    }
    byLoc.set(decodeEntities(loc[1]), alternates);
  }
  return byLoc;
}

function issue(code: SeoIssueCode, severity: SeoIssue["severity"], message: string): SeoIssue {
  return { code, severity, message };
}

/** Lo que el sitemap y el mapa de keywords esperan de UNA página (todo opcional: sin ello solo se auditan las comprobaciones estructurales). */
export interface PageAuditContext {
  /** Keyword primaria que debe estar en el título y el H1 (clúster dueño de esta URL en el mapa de keywords). */
  expectation?: KeywordExpectation;
  /** Alternativas de idioma que el sitemap declara para esta URL. */
  sitemapAlternates?: Record<string, string>;
  /** Todas las URLs del sitemap (para comprobar que cada hreflang apunta a una página indexable). */
  sitemapUrls?: ReadonlySet<string>;
}

/** Ruta normalizada (sin barra final; la raíz es "/") de una URL absoluta. */
function pathOf(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  } catch {
    return url;
  }
}

/** Problemas de hreflang de una página respecto de lo que declara el sitemap (lista vacía = completo). */
export function checkHreflang(
  pageUrl: string,
  htmlAlternates: { hreflang: string; href: string }[],
  context: Pick<PageAuditContext, "sitemapAlternates" | "sitemapUrls">
): string[] {
  const declared = context.sitemapAlternates;
  // Sin alternativas en el sitemap (p. ej. las páginas legales, solo en español) no hay nada que cruzar.
  if (!declared || Object.keys(declared).length === 0) return [];

  const problems: string[] = [];
  const inHtml = new Map(htmlAlternates.map((a) => [a.hreflang, a.href]));
  const knownUrls = context.sitemapUrls ? new Set([...context.sitemapUrls].map(normalizeUrl)) : null;
  for (const [lang, href] of Object.entries(declared)) {
    const actual = inHtml.get(lang);
    if (actual === undefined) problems.push(`falta hreflang="${lang}" (${href})`);
    else if (normalizeUrl(actual) !== normalizeUrl(href)) problems.push(`hreflang="${lang}" apunta a ${actual} y el sitemap declara ${href}`);
    if (knownUrls && !knownUrls.has(normalizeUrl(href))) problems.push(`hreflang="${lang}" apunta a una URL que no está en el sitemap (${href})`);
  }
  for (const lang of inHtml.keys()) {
    if (!(lang in declared)) problems.push(`hreflang="${lang}" no figura en el sitemap`);
  }
  if (!htmlAlternates.some((a) => normalizeUrl(a.href) === normalizeUrl(pageUrl))) {
    problems.push("ningún hreflang apunta a la propia página (falta la autorreferencia)");
  }
  return problems;
}

/** Problemas que se detectan mirando UNA página (los duplicados entre páginas se cruzan después). */
export function auditParsedPage(
  expectedUrl: string,
  response: { status: number | null; ttfbMs: number | null; html: string | null; error?: string; fetchedUrl?: string },
  context: PageAuditContext = {}
): SeoPageResult {
  const base: SeoPageResult = {
    url: expectedUrl,
    fetchedUrl: response.fetchedUrl ?? expectedUrl,
    status: response.status,
    ttfbMs: response.ttfbMs,
    title: null,
    description: null,
    canonical: null,
    h1Count: 0,
    h1Text: null,
    robots: null,
    issues: [],
  };

  if (response.error) {
    base.issues.push(issue("fetch_error", "error", `No se pudo pedir la URL: ${response.error}`));
    return base;
  }
  if (response.status !== 200) {
    base.issues.push(issue("status", "error", `Respondió ${response.status ?? "sin status"} (se esperaba 200)`));
  }
  if (response.html === null) return base;

  const parsed = parseHtml(response.html);
  base.title = parsed.title;
  base.description = parsed.description;
  base.canonical = parsed.canonical;
  base.h1Count = parsed.h1Count;
  base.h1Text = parsed.h1Text;
  base.robots = parsed.robots;

  if (response.status !== 200) return base;

  if (!parsed.canonical) {
    base.issues.push(issue("canonical_missing", "error", "No declara <link rel=\"canonical\">"));
  } else if (normalizeUrl(parsed.canonical) !== normalizeUrl(expectedUrl)) {
    base.issues.push(
      issue("canonical_mismatch", "error", `El canonical apunta a ${parsed.canonical} en vez de a sí misma (${expectedUrl})`)
    );
  }

  if (!parsed.title) {
    base.issues.push(issue("title_missing", "error", "No tiene <title>"));
  } else if (parsed.title.length > TITLE_MAX) {
    base.issues.push(issue("title_too_long", "error", `Título de ${parsed.title.length} caracteres (máx. ${TITLE_MAX})`));
  }

  if (!parsed.description) {
    base.issues.push(issue("description_missing", "error", "No tiene meta description"));
  } else if (parsed.description.length > DESCRIPTION_MAX) {
    base.issues.push(
      issue("description_too_long", "error", `Descripción de ${parsed.description.length} caracteres (máx. ${DESCRIPTION_MAX})`)
    );
  }

  if (parsed.h1Count !== 1) {
    base.issues.push(issue("h1_count", "error", `Tiene ${parsed.h1Count} etiquetas H1 (debe haber exactamente 1)`));
  }

  if (parsed.imagesWithoutAlt > 0) {
    base.issues.push(issue("img_missing_alt", "error", `${parsed.imagesWithoutAlt} imagen(es) sin atributo alt`));
  }

  // Un `{{TODO: …}}` visible en una página pública es contenido a medio escribir.
  if (response.html.includes("{{TODO")) {
    base.issues.push(issue("todo_placeholder", "error", "El HTML contiene un marcador {{TODO}} sin completar"));
  }

  if (parsed.robots && /\bnoindex\b/i.test(parsed.robots)) {
    base.issues.push(issue("noindex_in_sitemap", "error", "Está en el sitemap pero declara noindex"));
  }

  // La keyword primaria del mapa debe estar en el título Y en el H1 de la página que la posee.
  if (context.expectation) {
    const { primaryKeyword } = context.expectation;
    const missingIn = [
      containsKeyword(parsed.title ?? "", primaryKeyword) ? null : "el título",
      containsKeyword(parsed.h1Text ?? "", primaryKeyword) ? null : "el H1",
    ].filter((place): place is string => place !== null);
    if (missingIn.length > 0) {
      base.issues.push(
        issue("keyword_primary_missing", "error", `La keyword primaria "${primaryKeyword}" (${context.expectation.cluster}) no aparece en ${missingIn.join(" ni en ")}`)
      );
    }
  }

  const hreflangProblems = checkHreflang(expectedUrl, parsed.hreflangs, context);
  if (hreflangProblems.length > 0) {
    base.issues.push(issue("hreflang_incomplete", "error", `hreflang incompleto: ${hreflangProblems.slice(0, 3).join("; ")}`));
  }

  return base;
}

/** Marca los títulos repetidos entre URLs distintas. Muta y devuelve el mismo arreglo. */
export function flagDuplicateTitles(pages: SeoPageResult[]): SeoPageResult[] {
  const byTitle = new Map<string, SeoPageResult[]>();
  for (const page of pages) {
    if (!page.title) continue;
    const key = page.title.toLowerCase();
    const group = byTitle.get(key);
    if (group) group.push(page);
    else byTitle.set(key, [page]);
  }
  for (const group of byTitle.values()) {
    if (group.length < 2) continue;
    for (const page of group) {
      const others = group.filter((p) => p !== page).map((p) => p.url);
      page.issues.push(
        issue("title_duplicate", "error", `Título duplicado con ${others.length} URL(s): ${others.slice(0, 3).join(", ")}`)
      );
    }
  }
  return pages;
}

/** Avisa (no rompe) de los H1 idénticos entre URLs distintas: señal de páginas que compiten por la misma búsqueda. */
export function flagDuplicateH1(pages: SeoPageResult[]): SeoPageResult[] {
  const byH1 = new Map<string, SeoPageResult[]>();
  for (const page of pages) {
    if (!page.h1Text) continue;
    const key = page.h1Text.toLowerCase();
    const group = byH1.get(key);
    if (group) group.push(page);
    else byH1.set(key, [page]);
  }
  for (const group of byH1.values()) {
    if (group.length < 2) continue;
    for (const page of group) {
      const others = group.filter((p) => p !== page).map((p) => p.url);
      page.issues.push(issue("h1_duplicate", "warning", `H1 duplicado con ${others.length} URL(s): ${others.slice(0, 3).join(", ")}`));
    }
  }
  return pages;
}

export function summarizeReport(pages: SeoPageResult[]): SeoHealthReport["totals"] {
  const count = (code: SeoIssueCode) => pages.filter((p) => p.issues.some((i) => i.code === code)).length;
  const ttfbs = pages.map((p) => p.ttfbMs).filter((v): v is number => v !== null);
  const all = pages.flatMap((p) => p.issues);
  return {
    pages: pages.length,
    withErrors: pages.filter((p) => p.issues.some((i) => i.severity === "error")).length,
    errors: all.filter((i) => i.severity === "error").length,
    warnings: all.filter((i) => i.severity === "warning").length,
    canonicalErrors: pages.filter((p) => p.issues.some((i) => i.code === "canonical_mismatch" || i.code === "canonical_missing")).length,
    duplicateTitles: count("title_duplicate"),
    missingH1: pages.filter((p) => p.issues.some((i) => i.code === "h1_count")).length,
    nonOkStatus: pages.filter((p) => p.issues.some((i) => i.code === "status" || i.code === "fetch_error")).length,
    avgTtfbMs: ttfbs.length ? Math.round(ttfbs.reduce((a, b) => a + b, 0) / ttfbs.length) : null,
    maxTtfbMs: ttfbs.length ? Math.max(...ttfbs) : null,
  };
}

export interface RunOptions {
  /** Origen desde el que se piden las páginas (producción o `http://localhost:3000`). */
  baseUrl: string;
  concurrency?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Callback opcional para mostrar avance (la CLI lo usa). */
  onProgress?: (done: number, total: number) => void;
  /** Keyword primaria esperada por ruta (del mapa de keywords): título y H1 de esas URLs deben contenerla. */
  expectations?: readonly KeywordExpectation[];
}

async function fetchPage(
  expectedUrl: string,
  baseUrl: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  context: PageAuditContext
): Promise<SeoPageResult> {
  // El sitemap lista las URLs públicas; para auditar otro entorno se reemplaza el origen y se conserva la ruta.
  const parsed = new URL(expectedUrl);
  const fetchedUrl = `${baseUrl.replace(/\/+$/, "")}${parsed.pathname}${parsed.search}`;
  const started = performance.now();
  try {
    const res = await fetchImpl(fetchedUrl, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ttfbMs = Math.round(performance.now() - started);
    const html = res.status === 200 ? await res.text() : null;
    if (res.status !== 200) await res.body?.cancel();
    return auditParsedPage(expectedUrl, { status: res.status, ttfbMs, html, fetchedUrl }, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return auditParsedPage(expectedUrl, { status: null, ttfbMs: null, html: null, error: message, fetchedUrl }, context);
  }
}

/** Recorre el sitemap de `baseUrl` y audita cada URL. No lanza por errores de SEO: los devuelve en el reporte. */
export async function runSeoHealthCheck(options: RunOptions): Promise<SeoHealthReport> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const startedAt = new Date().toISOString();

  const sitemapRes = await fetchImpl(`${baseUrl}/sitemap.xml`, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!sitemapRes.ok) {
    throw new Error(`/sitemap.xml respondió ${sitemapRes.status} en ${baseUrl}`);
  }
  const sitemapXml = await sitemapRes.text();
  const urls = Array.from(new Set(parseSitemapLocs(sitemapXml)));
  const withoutLastmod = new Set(parseSitemapEntries(sitemapXml).filter((e) => !e.lastmod).map((e) => e.loc));
  const alternatesByLoc = parseSitemapAlternates(sitemapXml);
  const sitemapUrls = new Set(urls);
  const expectationByPath = new Map((options.expectations ?? []).map((e) => [e.path, e]));
  if (urls.length === 0) throw new Error(`/sitemap.xml de ${baseUrl} no lista ninguna URL`);

  const pages: SeoPageResult[] = new Array(urls.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= urls.length) return;
      pages[index] = await fetchPage(urls[index], baseUrl, fetchImpl, timeoutMs, {
        expectation: expectationByPath.get(pathOf(urls[index])),
        sitemapAlternates: alternatesByLoc.get(urls[index]),
        sitemapUrls,
      });
      done++;
      options.onProgress?.(done, urls.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));

  for (const page of pages) {
    if (withoutLastmod.has(page.url)) {
      page.issues.push(issue("lastmod_missing", "warning", "La URL no declara <lastmod> en el sitemap"));
    }
  }

  flagDuplicateTitles(pages);
  flagDuplicateH1(pages);
  return {
    baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    pages,
    totals: summarizeReport(pages),
  };
}
