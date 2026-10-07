import { query } from "../db";
import { rethrowDbErrorAtRuntime } from "../dbBuildGuard";
import { logError } from "../logger";

// Fechas reales de última modificación para el <lastmod> del sitemap, de las
// páginas que salen de Postgres (las estáticas usan src/content/lastmod.json,
// ver scripts/generate-lastmod.mjs). Mismo criterio de error que el resto de
// consultas que alimentan páginas públicas: en build sin base se devuelve
// vacío; en producción en ejecución se relanza (el sitemap conserva su última
// versión buena en vez de publicar uno sin fechas).

const toIso = (value: unknown): string => (value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString());

/** `updated_at` de cada caso de portafolio publicado, por slug. */
export async function getPortfolioLastModifiedBySlug(): Promise<Record<string, string>> {
  try {
    const res = await query(
      `SELECT slug, updated_at FROM portfolio_projects WHERE status = 'published' AND deleted_at IS NULL;`
    );
    return Object.fromEntries(res.rows.map((row) => [String(row.slug), toIso(row.updated_at)]));
  } catch (error) {
    logError("❌ [lastmod] no se pudo leer el portafolio", error);
    rethrowDbErrorAtRuntime(error);
    return {};
  }
}

/** Última edición de cualquier perfil público del equipo, o `null` si no hay. */
export async function getTeamLastModified(): Promise<string | null> {
  try {
    const res = await query(`SELECT max(updated_at) AS last FROM team_profiles WHERE is_published = true AND deleted_at IS NULL;`);
    return res.rows[0]?.last ? toIso(res.rows[0].last) : null;
  } catch (error) {
    logError("❌ [lastmod] no se pudo leer el equipo", error);
    rethrowDbErrorAtRuntime(error);
    return null;
  }
}
