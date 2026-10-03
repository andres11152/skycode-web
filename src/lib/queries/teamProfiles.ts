import { query } from "../db";
import { logError } from "../logger";
import type { Locale } from "../i18n";
import type { AvatarVariants } from "@/components/dashboard/types";
import type { PublicTeamMember } from "@/content/teamShared";

interface QueryRunner {
  query: typeof query;
}

const LOCALES: Locale[] = ["es", "en", "fr"];

/**
 * Trae la traducción de un perfil para `locale`, cayendo a español si esa
 * fila no existe — mismo criterio de "ES con fallback" que el resto del
 * sitio (ver `getTranslationRow` en queries/portfolio.ts).
 */
async function getProfileTranslation(profileId: number, locale: Locale) {
  const columns = "name, public_role, public_bio";
  const res = await query(
    `SELECT ${columns} FROM team_profile_translations WHERE profile_id = $1 AND locale = $2;`,
    [profileId, locale]
  );
  if (res.rows[0]) return res.rows[0];
  if (locale === "es") return null;
  const fallback = await query(
    `SELECT ${columns} FROM team_profile_translations WHERE profile_id = $1 AND locale = 'es';`,
    [profileId]
  );
  return fallback.rows[0] ?? null;
}

/**
 * Equipo público de `/equipo`, en el orden que fijó el admin (`sort_order`).
 * Atrapa cualquier error de conexión y devuelve `[]` en vez de propagar,
 * mismo criterio que `getPublishedArticles()`/`getPublishedPortfolioProjects()`:
 * `next build` en CI corre sin Postgres y esta función se ejecuta en build
 * time al prerenderizar la página — sin el catch, un build sin base
 * fallaría entero en vez de dejar la sección vacía hasta el primer request.
 */
export async function getPublishedTeamProfiles(locale: Locale): Promise<PublicTeamMember[]> {
  try {
    const res = await query(
      `SELECT id, slug, avatar_variants, linkedin_url, github_url
       FROM team_profiles
       WHERE is_published = true AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC;`
    );

    const members = await Promise.all(
      res.rows.map(async (row) => {
        const translation = await getProfileTranslation(Number(row.id), locale);
        // Sin traducción ni siquiera en español no hay nada que mostrar —
        // no debería pasar (publicar exige el español, ver
        // `setTeamProfilePublished`), pero devolver `null` es más honesto
        // que pintar una tarjeta con el nombre vacío.
        if (!translation) return null;

        const variants = (row.avatar_variants as AvatarVariants | null) ?? null;
        return {
          slug: String(row.slug),
          name: String(translation.name ?? ""),
          role: String(translation.public_role ?? ""),
          description: String(translation.public_bio ?? ""),
          photo: variants?.lg ?? null,
          linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : null,
          githubUrl: row.github_url ? String(row.github_url) : null,
        } satisfies PublicTeamMember;
      })
    );

    return members.filter((m): m is PublicTeamMember => m !== null);
  } catch (error) {
    logError("Error al leer los perfiles públicos del equipo", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Administración (/dashboard/equipo/perfiles) — requiere `team:read`/`team:write`.
// ---------------------------------------------------------------------------

export interface AdminTeamProfileTranslation {
  locale: Locale;
  name: string;
  publicRole: string;
  publicBio: string;
}

export interface AdminTeamProfile {
  id: number;
  slug: string;
  userId: number | null;
  /** Nombre de la cuenta enlazada, si la hay — para mostrar "vinculado a X" sin un segundo fetch. */
  linkedUserName: string | null;
  avatar: AvatarVariants | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  translations: Record<Locale, AdminTeamProfileTranslation | null>;
}

const ADMIN_PROFILE_SELECT = `SELECT p.id, p.slug, p.user_id, p.avatar_variants, p.linkedin_url, p.github_url,
            p.is_published, p.sort_order, u.name AS linked_user_name
     FROM team_profiles p
     LEFT JOIN users u ON u.id = p.user_id`;

export async function getAdminTeamProfiles(): Promise<AdminTeamProfile[]> {
  const res = await query(`${ADMIN_PROFILE_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.sort_order ASC, p.id ASC;`);
  return shapeAdminProfiles(res.rows);
}

/** Un perfil para su editor en `/dashboard/equipo/perfiles/[id]`. */
export async function getAdminTeamProfile(id: number): Promise<AdminTeamProfile | null> {
  const res = await query(`${ADMIN_PROFILE_SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL;`, [id]);
  const [profile] = await shapeAdminProfiles(res.rows);
  return profile ?? null;
}

async function shapeAdminProfiles(rows: Record<string, unknown>[]): Promise<AdminTeamProfile[]> {
  return Promise.all(
    rows.map(async (row) => {
      const translationsRes = await query(
        `SELECT locale, name, public_role, public_bio FROM team_profile_translations WHERE profile_id = $1;`,
        [row.id]
      );
      const translations = Object.fromEntries(LOCALES.map((l) => [l, null])) as Record<
        Locale,
        AdminTeamProfileTranslation | null
      >;
      for (const t of translationsRes.rows) {
        translations[t.locale as Locale] = {
          locale: t.locale as Locale,
          name: String(t.name ?? ""),
          publicRole: String(t.public_role ?? ""),
          publicBio: String(t.public_bio ?? ""),
        };
      }

      return {
        id: Number(row.id),
        slug: String(row.slug),
        userId: row.user_id !== null && row.user_id !== undefined ? Number(row.user_id) : null,
        linkedUserName: row.linked_user_name ? String(row.linked_user_name) : null,
        avatar: (row.avatar_variants as AvatarVariants | null) ?? null,
        linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : null,
        githubUrl: row.github_url ? String(row.github_url) : null,
        isPublished: Boolean(row.is_published),
        sortOrder: Number(row.sort_order),
        translations,
      };
    })
  );
}

export async function createTeamProfile(
  data: { slug: string; sortOrder: number; createdBy: number | string },
  dbRunner: QueryRunner
): Promise<number> {
  const res = await dbRunner.query(
    `INSERT INTO team_profiles (slug, sort_order, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING id;`,
    [data.slug, data.sortOrder, data.createdBy]
  );
  return Number(res.rows[0].id);
}

export interface UpdateTeamProfileParams {
  slug?: string;
  userId?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  sortOrder?: number;
}

export async function updateTeamProfile(
  id: number,
  data: UpdateTeamProfileParams,
  actorId: number | string,
  dbRunner: QueryRunner
): Promise<boolean> {
  const res = await dbRunner.query(
    `UPDATE team_profiles SET
       slug = COALESCE($1, slug),
       user_id = CASE WHEN $2 THEN $3 ELSE user_id END,
       linkedin_url = CASE WHEN $4 THEN $5 ELSE linkedin_url END,
       github_url = CASE WHEN $6 THEN $7 ELSE github_url END,
       sort_order = COALESCE($8, sort_order),
       updated_by = $9,
       updated_at = now()
     WHERE id = $10 AND deleted_at IS NULL
     RETURNING id;`,
    [
      data.slug ?? null,
      data.userId !== undefined,
      data.userId ?? null,
      data.linkedinUrl !== undefined,
      data.linkedinUrl ?? null,
      data.githubUrl !== undefined,
      data.githubUrl ?? null,
      data.sortOrder ?? null,
      actorId,
      id,
    ]
  );
  return res.rows.length > 0;
}

export async function upsertTeamProfileTranslation(
  profileId: number,
  locale: Locale,
  data: { name: string; publicRole: string; publicBio: string },
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query(
    `INSERT INTO team_profile_translations (profile_id, locale, name, public_role, public_bio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (profile_id, locale) DO UPDATE SET
       name = EXCLUDED.name, public_role = EXCLUDED.public_role, public_bio = EXCLUDED.public_bio;`,
    [profileId, locale, data.name, data.publicRole, data.publicBio]
  );
}

export type PublishProfileResult =
  | { outcome: "ok"; slug: string }
  | { outcome: "not_found" }
  | { outcome: "missing_spanish_translation" };

/**
 * Publicar exige la traducción en español con nombre y cargo — mismo
 * criterio que `setPortfolioProjectStatus()`: es preferible bloquear la
 * publicación a dejar una tarjeta de persona vacía en la web pública.
 * Despublicar nunca valida nada (siempre se puede sacar algo del aire).
 */
export async function setTeamProfilePublished(
  id: number,
  isPublished: boolean,
  actorId: number | string,
  dbRunner: QueryRunner
): Promise<PublishProfileResult> {
  const profile = await dbRunner.query(
    `SELECT slug FROM team_profiles WHERE id = $1 AND deleted_at IS NULL;`,
    [id]
  );
  if (profile.rows.length === 0) return { outcome: "not_found" };

  if (isPublished) {
    const es = await dbRunner.query(
      `SELECT name, public_role FROM team_profile_translations WHERE profile_id = $1 AND locale = 'es';`,
      [id]
    );
    const row = es.rows[0];
    if (!row || !String(row.name ?? "").trim() || !String(row.public_role ?? "").trim()) {
      return { outcome: "missing_spanish_translation" };
    }
  }

  await dbRunner.query(
    `UPDATE team_profiles SET is_published = $1, updated_by = $2, updated_at = now() WHERE id = $3;`,
    [isPublished, actorId, id]
  );
  return { outcome: "ok", slug: String(profile.rows[0].slug) };
}

/** Borrado lógico, mismo criterio que el resto de tablas del proyecto. Devuelve el slug para revalidar la ruta pública. */
export async function softDeleteTeamProfile(id: number, dbRunner: QueryRunner): Promise<string | null> {
  const res = await dbRunner.query(
    `UPDATE team_profiles SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING slug;`,
    [id]
  );
  return res.rows[0] ? String(res.rows[0].slug) : null;
}

/** Igual que `setUserAvatar`: devuelve la clave anterior para borrar sus archivos tras el commit. */
export async function setTeamProfileAvatar(
  id: number,
  avatar: { storageKey: string; variants: AvatarVariants },
  dbRunner: QueryRunner
): Promise<string | null> {
  const previous = await dbRunner.query("SELECT avatar_storage_key FROM team_profiles WHERE id = $1;", [id]);
  if (previous.rows.length === 0) return null;

  await dbRunner.query(
    `UPDATE team_profiles SET avatar_storage_key = $1, avatar_variants = $2, updated_at = now() WHERE id = $3;`,
    [avatar.storageKey, JSON.stringify(avatar.variants), id]
  );
  const previousKey = previous.rows[0].avatar_storage_key;
  return previousKey ? String(previousKey) : null;
}

/** Quita la foto y devuelve la clave que había, para borrar sus archivos tras el commit. */
export async function clearTeamProfileAvatar(id: number, dbRunner: QueryRunner): Promise<string | null> {
  const previous = await dbRunner.query("SELECT avatar_storage_key FROM team_profiles WHERE id = $1;", [id]);
  if (previous.rows.length === 0) return null;

  await dbRunner.query(
    `UPDATE team_profiles SET avatar_storage_key = NULL, avatar_variants = NULL, updated_at = now() WHERE id = $1;`,
    [id]
  );
  const previousKey = previous.rows[0].avatar_storage_key;
  return previousKey ? String(previousKey) : null;
}

/**
 * Cuántos artículos del blog citan este slug como autor
 * (`articles.author_slug`) — cada uno enlaza a `/equipo#slug` y lo usa en
 * su JSON-LD `Person`. El editor lo muestra antes de dejar cambiar el slug,
 * porque cambiarlo rompe esos enlaces en silencio.
 */
export async function countArticlesByAuthorSlug(slug: string): Promise<number> {
  const res = await query("SELECT COUNT(*)::int AS n FROM articles WHERE author_slug = $1;", [slug]);
  return Number(res.rows[0]?.n ?? 0);
}
