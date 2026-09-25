import { query } from "../db";
import type { PortfolioTechCategory, PortfolioTechnology } from "@/content/portfolioShared";

interface QueryRunner {
  query: typeof query;
}

function shapeTechnology(row: Record<string, unknown>): PortfolioTechnology {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category: row.category as PortfolioTechCategory,
    iconSource: row.icon_source as PortfolioTechnology["iconSource"],
    iconRef: String(row.icon_ref),
    websiteUrl: row.website_url ? String(row.website_url) : null,
  };
}

/**
 * Catálogo completo de tecnologías (/dashboard/portafolio/tecnologias) —
 * reutilizable entre casos de estudio, para no repetir texto libre sin
 * ícono como hacía `tags` en el portafolio viejo (ver migración 0034).
 */
export async function getAllTechnologies(): Promise<PortfolioTechnology[]> {
  const res = await query(`SELECT * FROM portfolio_technologies ORDER BY category ASC, name ASC;`);
  return res.rows.map(shapeTechnology);
}

/** Cuántos proyectos usan cada tecnología — para que la UI del catálogo impida borrar una en uso en vez de dejar que el error de FK (`ON DELETE RESTRICT`) sea la única señal. */
export async function getTechnologyUsageCounts(): Promise<Map<number, number>> {
  const res = await query(
    `SELECT technology_id, COUNT(*) AS project_count FROM portfolio_project_technologies GROUP BY technology_id;`
  );
  return new Map(res.rows.map((row) => [Number(row.technology_id), Number(row.project_count)]));
}

export interface CreateTechnologyData {
  slug: string;
  name: string;
  category: PortfolioTechCategory;
  iconSource: "simple-icons" | "custom";
  iconRef: string;
  websiteUrl?: string | null;
}

export async function createTechnology(data: CreateTechnologyData, dbRunner: QueryRunner): Promise<PortfolioTechnology> {
  const res = await dbRunner.query(
    `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref, website_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
    [data.slug, data.name, data.category, data.iconSource, data.iconRef, data.websiteUrl ?? null]
  );
  return shapeTechnology(res.rows[0]);
}

export interface UpdateTechnologyData {
  name?: string;
  category?: PortfolioTechCategory;
  iconSource?: "simple-icons" | "custom";
  iconRef?: string;
  websiteUrl?: string | null;
}

export async function updateTechnology(id: number, data: UpdateTechnologyData, dbRunner: QueryRunner): Promise<PortfolioTechnology | null> {
  const res = await dbRunner.query(
    `UPDATE portfolio_technologies SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       icon_source = COALESCE($3, icon_source),
       icon_ref = COALESCE($4, icon_ref),
       website_url = CASE WHEN $5::boolean THEN $6 ELSE website_url END
     WHERE id = $7
     RETURNING *;`,
    [data.name ?? null, data.category ?? null, data.iconSource ?? null, data.iconRef ?? null, "websiteUrl" in data, data.websiteUrl ?? null, id]
  );
  return res.rows[0] ? shapeTechnology(res.rows[0]) : null;
}

export type DeleteTechnologyResult = { outcome: "ok" } | { outcome: "not_found" } | { outcome: "in_use"; projectCount: number };

/** Borrado físico real (no lógico) — un catálogo de tecnologías no tiene el mismo peso legal/contable que clientes o facturas, y una tecnología sin uso no deja ningún rastro que preservar. Bloqueado por `ON DELETE RESTRICT` si está en uso — acá se verifica antes para devolver un mensaje claro en vez de que el caller reciba un error crudo de Postgres. */
export async function deleteTechnology(id: number, dbRunner: QueryRunner): Promise<DeleteTechnologyResult> {
  const usageRes = await dbRunner.query(
    `SELECT COUNT(*) AS count FROM portfolio_project_technologies WHERE technology_id = $1;`,
    [id]
  );
  const projectCount = Number(usageRes.rows[0].count);
  if (projectCount > 0) return { outcome: "in_use", projectCount };

  const res = await dbRunner.query(`DELETE FROM portfolio_technologies WHERE id = $1 RETURNING id;`, [id]);
  return res.rows.length > 0 ? { outcome: "ok" } : { outcome: "not_found" };
}
