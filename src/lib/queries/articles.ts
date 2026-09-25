import { query } from "../db";
import { logError } from "../logger";
// De blogShared, no de content/blog.ts — ese archivo importa de acá
// (getPublishedArticles/getPublishedArticleBySlug), así que importar sus
// tipos de vuelta crearía un ciclo. blogShared es la base común sin DB.
import type { BlogBlock, BlogPost } from "@/content/blogShared";
import type { Locale } from "@/lib/i18n";

interface QueryRunner {
  query: typeof query;
}

export type ArticleStatus = "draft" | "review" | "published";

export interface Article {
  id: number;
  slug: string;
  locale: Locale;
  status: ArticleStatus;
  title: string;
  description: string;
  author: string;
  authorSlug: string;
  tags: string[];
  content: BlogBlock[];
  targetKeyword: string | null;
  publishedAt: string | null;
  createdBy: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * `pg` deserializa columnas TIMESTAMPTZ como `Date`, no como string — usar
 * `String(row.x)` sobre esos campos invoca `Date.prototype.toString()`
 * ("Wed Sep 23 2026 00:00:00 GMT+0000 (...)"), formato inválido para
 * sitemap.xml (W3C Datetime) y para `dateModified`/`article:modified_time`.
 * Esta función siempre produce ISO 8601, sin importar si `pg` ya lo dio
 * como Date o (en tests/mocks) como string.
 */
function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function shapeArticleRow(row: Record<string, unknown>): Article {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    locale: row.locale as Locale,
    status: row.status as ArticleStatus,
    title: String(row.title),
    description: String(row.description),
    author: String(row.author),
    authorSlug: String(row.author_slug),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    content: (row.content ?? []) as BlogBlock[],
    targetKeyword: row.target_keyword ? String(row.target_keyword) : null,
    publishedAt: row.published_at ? toIsoString(row.published_at) : null,
    createdBy: row.created_by ? Number(row.created_by) : null,
    approvedBy: row.approved_by ? Number(row.approved_by) : null,
    approvedAt: row.approved_at ? toIsoString(row.approved_at) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

/** Forma que consume el sitio público (`content/blog.ts::BlogPost`) — recorta los campos internos del dashboard. */
export function toBlogPost(article: Article): BlogPost {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt ?? article.createdAt,
    updatedAt: article.updatedAt,
    author: article.author,
    authorSlug: article.authorSlug,
    tags: article.tags,
    content: article.content,
  };
}

/**
 * Posts publicados de un locale, más reciente primero — reemplaza a
 * `getBlogPosts()` (antes síncrono, leyendo del JSON) en todas las rutas
 * públicas del blog. Único punto de lectura pública, así que un artículo
 * despublicado (vuelto a draft) desaparece del sitio en el siguiente
 * `revalidatePath`, no solo de la consulta.
 */
export async function getPublishedArticles(locale: Locale): Promise<BlogPost[]> {
  try {
    const res = await query(
      `SELECT * FROM articles
       WHERE locale = $1 AND status = 'published' AND deleted_at IS NULL
       ORDER BY published_at DESC;`,
      [locale]
    );
    return res.rows.map(shapeArticleRow).map(toBlogPost);
  } catch (error) {
    // De mejor esfuerzo a propósito: esta función la llaman tanto rutas
    // públicas en runtime (donde un fallo de DB sí debería alertar) como
    // `generateStaticParams`/páginas del blog/`HomeSections`/`sitemap.ts`
    // en BUILD TIME — y `next build` en CI (.github/workflows/ci.yml, job
    // `verify`) corre explícitamente SIN Postgres. Sin este catch, cada
    // `next build` sin DB (incluido el de CI) tumbaría el build entero por
    // completo en vez de solo dejar el blog vacío hasta el primer request
    // real contra una DB de verdad (`dynamicParams = true` + `revalidate`
    // en las páginas del blog resuelven esa primera carga vía ISR).
    logError("❌ [Articles] getPublishedArticles falló (¿build sin DATABASE_URL?)", error);
    return [];
  }
}

export async function getPublishedArticleBySlug(slug: string, locale: Locale): Promise<BlogPost | null> {
  try {
    const res = await query(
      `SELECT * FROM articles
       WHERE slug = $1 AND locale = $2 AND status = 'published' AND deleted_at IS NULL
       LIMIT 1;`,
      [slug, locale]
    );
    if (res.rows.length === 0) return null;
    return toBlogPost(shapeArticleRow(res.rows[0]));
  } catch (error) {
    logError("❌ [Articles] getPublishedArticleBySlug falló (¿build sin DATABASE_URL?)", error);
    return null;
  }
}

/** `true` si ya existe una fila (de cualquier estado) para ese slug+locale — usado para no generar un borrador duplicado sobre una query ya cubierta. */
export async function articleExists(slug: string, locale: Locale): Promise<boolean> {
  const res = await query(`SELECT 1 FROM articles WHERE slug = $1 AND locale = $2 AND deleted_at IS NULL LIMIT 1;`, [
    slug,
    locale,
  ]);
  return res.rows.length > 0;
}

/**
 * `true` si ya existe un borrador/artículo (de cualquier estado) generado
 * para esa keyword exacta en ese locale — el cron de generación
 * (`/api/cron/content-pulse`) la consulta antes de llamar a la API de
 * Anthropic para no gastar tokens regenerando la misma oportunidad de
 * contenido semana tras semana mientras siga en `draft` sin revisar.
 */
export async function articleExistsForKeyword(targetKeyword: string, locale: Locale): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM articles WHERE target_keyword = $1 AND locale = $2 AND deleted_at IS NULL LIMIT 1;`,
    [targetKeyword, locale]
  );
  return res.rows.length > 0;
}

export interface ArticlesPageParams {
  status: ArticleStatus | "ALL";
  locale: Locale | "ALL";
  q: string;
  page: number;
  pageSize: number;
}

export interface ArticlesPageResult {
  articles: Article[];
  total: number;
}

/** Bandeja del dashboard (`/dashboard/contenido`) — filtra por estado/locale/búsqueda, paginada en SQL, mismo patrón que `getAuditLogPage`. */
export async function getArticlesPage({ status, locale, q, page, pageSize }: ArticlesPageParams): Promise<ArticlesPageResult> {
  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];

  if (status !== "ALL") {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (locale !== "ALL") {
    params.push(locale);
    conditions.push(`locale = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(title ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(pageSize);
  const limitIdx = params.length;
  params.push((page - 1) * pageSize);
  const offsetIdx = params.length;

  const [rowsRes, countRes] = await Promise.all([
    query(
      `SELECT * FROM articles ${where} ORDER BY updated_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM articles ${where};`, params.slice(0, params.length - 2)),
  ]);

  return {
    articles: rowsRes.rows.map(shapeArticleRow),
    total: Number(countRes.rows[0]?.total ?? 0),
  };
}

export async function getArticleById(id: number): Promise<Article | null> {
  const res = await query(`SELECT * FROM articles WHERE id = $1 AND deleted_at IS NULL LIMIT 1;`, [id]);
  if (res.rows.length === 0) return null;
  return shapeArticleRow(res.rows[0]);
}

export interface CreateArticleData {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  author: string;
  authorSlug: string;
  tags: string[];
  content: BlogBlock[];
  targetKeyword?: string | null;
}

/** Crea un borrador — a mano desde el dashboard (userId real), o desde el cron de generación (`userId: null`, con `targetKeyword` poblado). */
export async function createArticleDraft(data: CreateArticleData, userId: number | string | null, dbRunner: QueryRunner = { query }): Promise<number> {
  const res = await dbRunner.query(
    `INSERT INTO articles (slug, locale, status, title, description, author, author_slug, tags, content, target_keyword, created_by)
     VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id;`,
    [
      data.slug,
      data.locale,
      data.title,
      data.description,
      data.author,
      data.authorSlug,
      data.tags,
      JSON.stringify(data.content),
      data.targetKeyword ?? null,
      userId,
    ]
  );
  return Number(res.rows[0].id);
}

export interface UpdateArticleData {
  slug: string;
  title: string;
  description: string;
  author: string;
  authorSlug: string;
  tags: string[];
  content: BlogBlock[];
}

/**
 * Edita el contenido de un artículo en `draft` o `review` — nunca cambia su
 * `status` (ver `submitForReview`/`approveAndPublish`/`rejectArticle` para
 * eso). El `slug` también es editable acá a propósito: nada público
 * depende de él todavía (el artículo ni siquiera se publicó), así que
 * cambiarlo antes de aprobar no rompe ninguna URL ya indexada — una vez
 * `published`, esta función deja de aceptar la fila (el filtro `status IN`
 * ya lo impide).
 */
export async function updateArticleContent(id: number, data: UpdateArticleData, dbRunner: QueryRunner = { query }): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE articles SET slug = $2, title = $3, description = $4, author = $5, author_slug = $6, tags = $7, content = $8, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND status IN ('draft', 'review')
     RETURNING id;`,
    [id, data.slug, data.title, data.description, data.author, data.authorSlug, data.tags, JSON.stringify(data.content)]
  );
  return res.rows.length > 0;
}

export async function submitForReview(id: number, dbRunner: QueryRunner = { query }): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE articles SET status = 'review', updated_at = now() WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL RETURNING id;`,
    [id]
  );
  return res.rows.length > 0;
}

export interface PublishResult {
  slug: string;
  locale: Locale;
}

/**
 * Aprueba y publica — `published_at` solo se fija la primera vez
 * (`COALESCE(published_at, now())`), así que republicar una edición
 * posterior no le cambia la fecha de publicación original, solo
 * `updated_at`. Devuelve `slug`+`locale` para que el caller (la ruta de
 * API) sepa qué rutas revalidar y qué URL mandarle a IndexNow — esta
 * función no importa `next/cache` a propósito, eso solo funciona dentro de
 * un Route Handler/Server Action, no en un módulo de queries reutilizado
 * también por el cron.
 */
export async function approveAndPublish(id: number, approvedBy: number | string, dbRunner: QueryRunner = { query }): Promise<PublishResult | null> {
  const res = await dbRunner.query(
    `UPDATE articles
     SET status = 'published', published_at = COALESCE(published_at, now()), updated_at = now(),
         approved_by = $2, approved_at = now(), rejection_reason = NULL
     WHERE id = $1 AND status = 'review' AND deleted_at IS NULL
     RETURNING slug, locale;`,
    [id, approvedBy]
  );
  if (res.rows.length === 0) return null;
  return { slug: String(res.rows[0].slug), locale: res.rows[0].locale as Locale };
}

/** Rechaza — vuelve a `draft` con el motivo, para que el autor (humano o el próximo ciclo del cron) lo corrija. */
export async function rejectArticle(id: number, reason: string, dbRunner: QueryRunner = { query }): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE articles SET status = 'draft', rejection_reason = $2, updated_at = now()
     WHERE id = $1 AND status = 'review' AND deleted_at IS NULL RETURNING id;`,
    [id, reason]
  );
  return res.rows.length > 0;
}

/**
 * Despublica — vuelve un artículo `published` a `draft` sin borrarlo. A
 * diferencia de `deleteArticle` (soft-delete, ver abajo), esto es
 * reversible desde el dashboard sin perder el contenido ni el historial.
 * Devuelve la ruta pública para que el caller la revalide (el artículo
 * debe dejar de servirse de inmediato, no esperar al próximo build).
 */
export async function unpublishArticle(id: number, dbRunner: QueryRunner = { query }): Promise<PublishResult | null> {
  const res = await dbRunner.query(
    `UPDATE articles SET status = 'draft', updated_at = now()
     WHERE id = $1 AND status = 'published' AND deleted_at IS NULL
     RETURNING slug, locale;`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return { slug: String(res.rows[0].slug), locale: res.rows[0].locale as Locale };
}

export interface DeleteArticleResult {
  slug: string;
  locale: Locale;
  /** Si venía `published`, el caller debe revalidar sus rutas públicas (ver revalidateArticlePaths) — un borrador eliminado nunca tuvo una ruta pública sirviéndolo. */
  wasPublished: boolean;
}

/**
 * Soft-delete, mismo patrón que el resto de tablas con `deleted_at` del
 * proyecto (leads/projects/campaigns/...). Devuelve `null` únicamente
 * cuando no encontró la fila (para que el caller pueda distinguir "no
 * existía" de "se borró un borrador, nada que revalidar") — antes esta
 * función devolvía `null` en ambos casos por igual, lo que hacía que
 * borrar con éxito un artículo en `draft` respondiera 404 en la ruta de
 * API, un bug real atrapado en revisión antes de llegar a producción.
 */
export async function deleteArticle(id: number, dbRunner: QueryRunner = { query }): Promise<DeleteArticleResult | null> {
  const res = await dbRunner.query(
    `UPDATE articles SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING slug, locale, status;`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return {
    slug: String(res.rows[0].slug),
    locale: res.rows[0].locale as Locale,
    wasPublished: res.rows[0].status === "published",
  };
}
