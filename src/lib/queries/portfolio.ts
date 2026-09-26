import { query } from "../db";
import { logError } from "../logger";
import type { Locale } from "../i18n";
import { shapeTechnology } from "./portfolioTechnologies";
import {
  resolveLocalizedText,
  type PortfolioImage,
  type PortfolioMetric,
  type PortfolioProject,
  type PortfolioStatus,
  type PortfolioTechnology,
} from "@/content/portfolioShared";

interface QueryRunner {
  query: typeof query;
}

function shapeImage(row: Record<string, unknown>, locale: Locale): PortfolioImage {
  return {
    id: Number(row.id),
    variants: (row.variants ?? { sm: "", md: "", lg: "" }) as PortfolioImage["variants"],
    width: Number(row.width),
    height: Number(row.height),
    alt: resolveLocalizedText(row.alt, locale),
  };
}

function shapeMetric(row: Record<string, unknown>, locale: Locale): PortfolioMetric {
  return { value: String(row.value), label: resolveLocalizedText(row.label, locale) };
}

/**
 * Trae la traducción de un proyecto para `locale`, cayendo a español si esa
 * fila no existe todavía — mismo criterio de "ES con EsBadge" del resto del
 * sitio (ver CLAUDE.md, "Internacionalización"), aplicado acá por caso de
 * estudio individual en vez de por sección completa.
 */
async function getTranslationRow(projectId: number, locale: Locale) {
  const columns = "title, client_label, summary, challenge, solution, results, capabilities";
  const res = await query(
    `SELECT ${columns} FROM portfolio_project_translations WHERE project_id = $1 AND locale = $2;`,
    [projectId, locale]
  );
  if (res.rows[0]) return res.rows[0];
  if (locale === "es") return null;
  const fallback = await query(
    `SELECT ${columns} FROM portfolio_project_translations WHERE project_id = $1 AND locale = 'es';`,
    [projectId]
  );
  return fallback.rows[0] ?? null;
}

async function assembleProject(projectRow: Record<string, unknown>, locale: Locale): Promise<PortfolioProject | null> {
  const projectId = Number(projectRow.id);

  const [translation, imagesRes, techRes, metricsRes] = await Promise.all([
    getTranslationRow(projectId, locale),
    query(`SELECT * FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC;`, [projectId]),
    query(
      `SELECT t.id, t.slug, t.name, t.category, t.icon_source, t.icon_ref, t.website_url
       FROM portfolio_project_technologies pt
       JOIN portfolio_technologies t ON t.id = pt.technology_id
       WHERE pt.project_id = $1 ORDER BY pt.sort_order ASC;`,
      [projectId]
    ),
    query(`SELECT value, label FROM portfolio_project_metrics WHERE project_id = $1 ORDER BY sort_order ASC;`, [projectId]),
  ]);

  // Sin traducción (ni siquiera en español) el caso no tiene nada que
  // mostrar — no debería pasar en la práctica (publicar exige español,
  // ver `setPortfolioProjectStatus`), pero un `null` acá es más honesto
  // que inventar textos vacíos silenciosos.
  if (!translation) return null;

  const images = imagesRes.rows.map((row) => shapeImage(row, locale));
  const coverImage = projectRow.cover_image_id
    ? images.find((img) => img.id === Number(projectRow.cover_image_id)) ?? images[0] ?? null
    : images[0] ?? null;

  return {
    slug: String(projectRow.slug),
    status: projectRow.status as PortfolioStatus,
    isFeatured: Boolean(projectRow.is_featured),
    liveUrl: projectRow.live_url ? String(projectRow.live_url) : null,
    industryIcon: String(projectRow.industry_icon),
    title: String(translation.title ?? ""),
    clientLabel: String(translation.client_label ?? ""),
    summary: String(translation.summary ?? ""),
    challenge: String(translation.challenge ?? ""),
    solution: String(translation.solution ?? ""),
    results: String(translation.results ?? ""),
    capabilities: Array.isArray(translation.capabilities) ? translation.capabilities : [],
    technologies: techRes.rows.map(shapeTechnology),
    images,
    coverImage,
    metrics: metricsRes.rows.map((row) => shapeMetric(row, locale)),
    publishedAt: projectRow.published_at ? String(projectRow.published_at) : null,
  };
}

/**
 * Portafolio público, ordenado como lo dejó el equipo en el panel
 * (`sort_order`), nunca por fecha — atrapa cualquier error de conexión y
 * devuelve `[]` en vez de propagar, mismo criterio que
 * `getPublishedArticles()`: `next build` en CI corre sin Postgres y estas
 * funciones se ejecutan en build time vía `generateStaticParams`/prerender
 * de la home.
 */
export async function getPublishedPortfolioProjects(locale: Locale): Promise<PortfolioProject[]> {
  try {
    const res = await query(
      `SELECT * FROM portfolio_projects WHERE status = 'published' AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC;`
    );
    const projects = await Promise.all(res.rows.map((row) => assembleProject(row, locale)));
    return projects.filter((p): p is PortfolioProject => p !== null);
  } catch (error) {
    logError("Error al leer el portafolio publicado", error);
    return [];
  }
}

export async function getPublishedPortfolioProjectBySlug(slug: string, locale: Locale): Promise<PortfolioProject | null> {
  try {
    const res = await query(
      `SELECT * FROM portfolio_projects WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL;`,
      [slug]
    );
    const row = res.rows[0];
    if (!row) return null;
    return await assembleProject(row, locale);
  } catch (error) {
    logError("Error al leer el caso de portafolio", error);
    return null;
  }
}

/** Para `generateStaticParams()` de `/portafolio/[slug]` — mismo criterio try/catch que el resto de este archivo. */
export async function getPublishedPortfolioSlugs(): Promise<string[]> {
  try {
    const res = await query(`SELECT slug FROM portfolio_projects WHERE status = 'published' AND deleted_at IS NULL;`);
    return res.rows.map((row) => String(row.slug));
  } catch (error) {
    logError("Error al leer los slugs del portafolio", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Administración (/dashboard/portafolio) — requiere `portfolio:read`/`portfolio:write`.
// ---------------------------------------------------------------------------

export interface AdminPortfolioListItem {
  id: number;
  slug: string;
  status: PortfolioStatus;
  isFeatured: boolean;
  sortOrder: number;
  industryIcon: string;
  titleEs: string;
  coverImage: PortfolioImage | null;
  updatedAt: string;
}

/** Listado admin: TODOS los estados (draft/published/archived), con el título en español como referencia rápida. */
export async function getAdminPortfolioList(): Promise<AdminPortfolioListItem[]> {
  const res = await query(`
    SELECT p.id, p.slug, p.status, p.is_featured, p.sort_order, p.industry_icon, p.updated_at, p.cover_image_id,
           tr.title AS title_es
    FROM portfolio_projects p
    LEFT JOIN portfolio_project_translations tr ON tr.project_id = p.id AND tr.locale = 'es'
    WHERE p.deleted_at IS NULL
    ORDER BY p.sort_order ASC, p.id ASC;
  `);

  const coverIds = res.rows.map((row) => row.cover_image_id).filter((id): id is number => id !== null);
  const covers =
    coverIds.length > 0
      ? await query(`SELECT * FROM portfolio_project_images WHERE id = ANY($1::int[]);`, [coverIds])
      : { rows: [] as Record<string, unknown>[] };
  const coverMap = new Map(covers.rows.map((row) => [Number(row.id), shapeImage(row, "es")]));

  return res.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    status: row.status as PortfolioStatus,
    isFeatured: Boolean(row.is_featured),
    sortOrder: Number(row.sort_order),
    industryIcon: String(row.industry_icon),
    titleEs: row.title_es ? String(row.title_es) : "(sin título en español)",
    coverImage: row.cover_image_id ? coverMap.get(Number(row.cover_image_id)) ?? null : null,
    updatedAt: String(row.updated_at),
  }));
}

export interface AdminPortfolioTranslation {
  locale: Locale;
  title: string;
  clientLabel: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  capabilities: string[];
}

export interface AdminPortfolioImage {
  id: number;
  variants: PortfolioImage["variants"];
  width: number;
  height: number;
  /** Crudo, sin resolver a un locale — el editor muestra/edita los 3 idiomas a la vez. */
  alt: Record<string, string>;
  sortOrder: number;
}

export interface AdminPortfolioMetric {
  id: number;
  value: string;
  label: Record<string, string>;
  sortOrder: number;
}

export interface AdminPortfolioDetail {
  id: number;
  slug: string;
  status: PortfolioStatus;
  isFeatured: boolean;
  sortOrder: number;
  liveUrl: string | null;
  industryIcon: string;
  coverImageId: number | null;
  translations: Record<Locale, AdminPortfolioTranslation | null>;
  technologies: PortfolioTechnology[];
  images: AdminPortfolioImage[];
  metrics: AdminPortfolioMetric[];
}

const LOCALES: Locale[] = ["es", "en", "fr"];

export async function getAdminPortfolioDetail(id: number): Promise<AdminPortfolioDetail | null> {
  const projectRes = await query(`SELECT * FROM portfolio_projects WHERE id = $1 AND deleted_at IS NULL;`, [id]);
  const project = projectRes.rows[0];
  if (!project) return null;

  const [translationsRes, techRes, imagesRes, metricsRes] = await Promise.all([
    query(
      `SELECT locale, title, client_label, summary, challenge, solution, results, capabilities
       FROM portfolio_project_translations WHERE project_id = $1;`,
      [id]
    ),
    query(
      `SELECT t.id, t.slug, t.name, t.category, t.icon_source, t.icon_ref, t.website_url
       FROM portfolio_project_technologies pt JOIN portfolio_technologies t ON t.id = pt.technology_id
       WHERE pt.project_id = $1 ORDER BY pt.sort_order ASC;`,
      [id]
    ),
    query(`SELECT * FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC;`, [id]),
    query(`SELECT * FROM portfolio_project_metrics WHERE project_id = $1 ORDER BY sort_order ASC;`, [id]),
  ]);

  const translationsByLocale = new Map(translationsRes.rows.map((row) => [String(row.locale), row]));
  const translations = Object.fromEntries(
    LOCALES.map((locale) => {
      const row = translationsByLocale.get(locale);
      if (!row) return [locale, null];
      return [
        locale,
        {
          locale,
          title: String(row.title ?? ""),
          clientLabel: String(row.client_label ?? ""),
          summary: String(row.summary ?? ""),
          challenge: String(row.challenge ?? ""),
          solution: String(row.solution ?? ""),
          results: String(row.results ?? ""),
          capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
        },
      ];
    })
  ) as Record<Locale, AdminPortfolioTranslation | null>;

  return {
    id: Number(project.id),
    slug: String(project.slug),
    status: project.status as PortfolioStatus,
    isFeatured: Boolean(project.is_featured),
    sortOrder: Number(project.sort_order),
    liveUrl: project.live_url ? String(project.live_url) : null,
    industryIcon: String(project.industry_icon),
    coverImageId: project.cover_image_id ? Number(project.cover_image_id) : null,
    translations,
    technologies: techRes.rows.map(shapeTechnology),
    images: imagesRes.rows.map((row) => ({
      id: Number(row.id),
      variants: (row.variants ?? { sm: "", md: "", lg: "" }) as PortfolioImage["variants"],
      width: Number(row.width),
      height: Number(row.height),
      alt: (row.alt ?? {}) as Record<string, string>,
      sortOrder: Number(row.sort_order),
    })),
    metrics: metricsRes.rows.map((row) => ({
      id: Number(row.id),
      value: String(row.value),
      label: (row.label ?? {}) as Record<string, string>,
      sortOrder: Number(row.sort_order),
    })),
  };
}

export interface CreatePortfolioProjectData {
  slug: string;
  industryIcon: string;
}

/** Crea el proyecto vacío (sin traducciones todavía) — el formulario de creación pide solo el slug y el ícono, el resto se completa en el editor. */
export async function createPortfolioProject(
  data: CreatePortfolioProjectData,
  actorId: number | string,
  dbRunner: QueryRunner
): Promise<number> {
  const res = await dbRunner.query(
    `INSERT INTO portfolio_projects (slug, industry_icon, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING id;`,
    [data.slug, data.industryIcon, actorId]
  );
  return res.rows[0].id as number;
}

export interface UpdatePortfolioProjectMetaData {
  slug?: string;
  liveUrl?: string | null;
  industryIcon?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

export async function updatePortfolioProjectMeta(
  id: number,
  data: UpdatePortfolioProjectMetaData,
  actorId: number | string,
  dbRunner: QueryRunner
): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE portfolio_projects SET
       slug = COALESCE($1, slug),
       live_url = CASE WHEN $2::boolean THEN $3 ELSE live_url END,
       industry_icon = COALESCE($4, industry_icon),
       is_featured = COALESCE($5, is_featured),
       sort_order = COALESCE($6, sort_order),
       updated_by = $7,
       updated_at = now()
     WHERE id = $8 AND deleted_at IS NULL
     RETURNING id;`,
    [
      data.slug ?? null,
      "liveUrl" in data,
      data.liveUrl ?? null,
      data.industryIcon ?? null,
      data.isFeatured ?? null,
      data.sortOrder ?? null,
      actorId,
      id,
    ]
  );
  return res.rows.length > 0;
}

export interface UpsertTranslationData {
  title: string;
  clientLabel: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  capabilities: string[];
}

/** Guarda (crea o reemplaza) la traducción completa de un idioma — el editor manda el bloque entero de ese idioma en cada guardado, no campos sueltos. */
export async function upsertPortfolioTranslation(
  projectId: number,
  locale: Locale,
  data: UpsertTranslationData,
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query(
    `INSERT INTO portfolio_project_translations (project_id, locale, title, client_label, summary, challenge, solution, results, capabilities)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (project_id, locale) DO UPDATE SET
       title = EXCLUDED.title,
       client_label = EXCLUDED.client_label,
       summary = EXCLUDED.summary,
       challenge = EXCLUDED.challenge,
       solution = EXCLUDED.solution,
       results = EXCLUDED.results,
       capabilities = EXCLUDED.capabilities;`,
    [projectId, locale, data.title, data.clientLabel, data.summary, data.challenge, data.solution, data.results, data.capabilities]
  );
}

export type SetStatusResult =
  | { outcome: "ok" }
  | { outcome: "not_found" }
  | { outcome: "missing_spanish_translation" }
  | { outcome: "missing_cover_image" };

/**
 * Cambia el estado del caso. Publicar exige portada + título/resumen en
 * español ya guardados — no se puede publicar un caso a medias (mismo
 * espíritu que "Aceptar y Firmar" deshabilitado en propuestas hasta que
 * el formulario esté completo). `published_at` se fija una sola vez
 * (`COALESCE`), mismo criterio que `approveAndPublish()` en articles.ts —
 * re-publicar tras archivar no le cambia la fecha original.
 */
export async function setPortfolioProjectStatus(
  id: number,
  status: PortfolioStatus,
  actorId: number | string,
  dbRunner: QueryRunner
): Promise<SetStatusResult> {
  const projectRes = await dbRunner.query(
    `SELECT id, cover_image_id FROM portfolio_projects WHERE id = $1 AND deleted_at IS NULL;`,
    [id]
  );
  if (projectRes.rows.length === 0) return { outcome: "not_found" };

  if (status === "published") {
    const esRes = await dbRunner.query(
      `SELECT title, summary FROM portfolio_project_translations WHERE project_id = $1 AND locale = 'es';`,
      [id]
    );
    const es = esRes.rows[0];
    if (!es || !String(es.title ?? "").trim() || !String(es.summary ?? "").trim()) {
      return { outcome: "missing_spanish_translation" };
    }
    if (!projectRes.rows[0].cover_image_id) {
      return { outcome: "missing_cover_image" };
    }
  }

  const publishedAtExpr = status === "published" ? "COALESCE(published_at, now())" : "published_at";
  await dbRunner.query(
    `UPDATE portfolio_projects SET status = $1, published_at = ${publishedAtExpr}, updated_by = $2, updated_at = now() WHERE id = $3;`,
    [status, actorId, id]
  );
  return { outcome: "ok" };
}

export async function softDeletePortfolioProject(id: number, dbRunner: QueryRunner): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE portfolio_projects SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id;`,
    [id]
  );
  return res.rows.length > 0;
}

export interface AddPortfolioImageData {
  storageKey: string;
  variants: PortfolioImage["variants"];
  width: number;
  height: number;
}

export async function addPortfolioProjectImage(
  projectId: number,
  data: AddPortfolioImageData,
  dbRunner: QueryRunner
): Promise<{ id: number; sortOrder: number }> {
  const sortRes = await dbRunner.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM portfolio_project_images WHERE project_id = $1;`,
    [projectId]
  );
  const nextOrder = Number(sortRes.rows[0].next_order);
  const res = await dbRunner.query(
    `INSERT INTO portfolio_project_images (project_id, storage_key, variants, width, height, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
    [projectId, data.storageKey, JSON.stringify(data.variants), data.width, data.height, nextOrder]
  );
  return { id: res.rows[0].id as number, sortOrder: nextOrder };
}

/** Devuelve el `storage_key` para que el caller borre también el objeto del bucket. */
export async function removePortfolioProjectImage(imageId: number, dbRunner: QueryRunner): Promise<{ storageKey: string } | null> {
  const res = await dbRunner.query(`DELETE FROM portfolio_project_images WHERE id = $1 RETURNING storage_key;`, [imageId]);
  const row = res.rows[0];
  return row ? { storageKey: String(row.storage_key) } : null;
}

/**
 * Combina (no reemplaza) el JSONB `alt` con lo que venga en `alt` — el
 * editor guarda el texto alternativo de un idioma a la vez (ver la ruta
 * PATCH), así que un `SET alt = $1` a secas borraría silenciosamente los
 * otros dos idiomas ya guardados. El operador `||` de JSONB en Postgres
 * hace exactamente ese merge superficial por clave.
 */
export async function updatePortfolioImageAlt(
  imageId: number,
  alt: Record<string, string>,
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query(`UPDATE portfolio_project_images SET alt = alt || $1::jsonb WHERE id = $2;`, [JSON.stringify(alt), imageId]);
}

export async function reorderPortfolioProjectImages(
  projectId: number,
  orderedImageIds: number[],
  dbRunner: QueryRunner
): Promise<void> {
  for (let i = 0; i < orderedImageIds.length; i++) {
    await dbRunner.query(
      `UPDATE portfolio_project_images SET sort_order = $1 WHERE id = $2 AND project_id = $3;`,
      [i, orderedImageIds[i], projectId]
    );
  }
}

export async function setPortfolioProjectCoverImage(projectId: number, imageId: number | null, dbRunner: QueryRunner): Promise<void> {
  await dbRunner.query(`UPDATE portfolio_projects SET cover_image_id = $1 WHERE id = $2;`, [imageId, projectId]);
}

/** Reemplaza el set completo de tecnologías del proyecto, en el orden dado — borra y vuelve a insertar en vez de calcular un diff, el volumen por proyecto es pequeño (unas pocas tecnologías). */
export async function setPortfolioProjectTechnologies(
  projectId: number,
  technologyIds: number[],
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query(`DELETE FROM portfolio_project_technologies WHERE project_id = $1;`, [projectId]);
  for (let i = 0; i < technologyIds.length; i++) {
    await dbRunner.query(
      `INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order) VALUES ($1, $2, $3);`,
      [projectId, technologyIds[i], i]
    );
  }
}

export interface SetMetricData {
  value: string;
  label: Record<string, string>;
}

export async function setPortfolioProjectMetrics(projectId: number, metrics: SetMetricData[], dbRunner: QueryRunner): Promise<void> {
  await dbRunner.query(`DELETE FROM portfolio_project_metrics WHERE project_id = $1;`, [projectId]);
  for (let i = 0; i < metrics.length; i++) {
    await dbRunner.query(
      `INSERT INTO portfolio_project_metrics (project_id, value, label, sort_order) VALUES ($1, $2, $3, $4);`,
      [projectId, metrics[i].value, JSON.stringify(metrics[i].label), i]
    );
  }
}
