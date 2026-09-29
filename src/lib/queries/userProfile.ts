import { query } from "../db";
import type { AvatarVariants, UserProfile } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

// Columnas del perfil que SÍ pueden salir de la base. Se listan explícitas
// (nunca `SELECT *`) porque `users` guarda en la misma fila
// `password_hash`, `totp_secret` y `totp_backup_codes`: un `SELECT *` acá
// terminaría filtrándolos al `diff` de `logAudit()`, que serializa crudo lo
// que reciba (ver lib/audit.ts). Mismo criterio que ya sigue
// `updateTeamMember()` en team.ts.
const PROFILE_COLUMNS = `id, name, email, role, status, phone, job_title, bio, timezone, locale,
  hire_date::text AS hire_date, avatar_variants, avatar_storage_key, created_at, updated_at`;

/**
 * `pg` devuelve TIMESTAMPTZ como `Date` de JS, y `String(date)` produce el
 * formato largo del locale ("Mon Sep 28 2026 19:55:33 GMT-0500…"), que
 * además TRUNCA los milisegundos — dos guardados en el mismo segundo
 * quedaban indistinguibles (lo atrapó el test de `updated_at`). ISO-8601 es
 * lo que el cliente puede volver a parsear sin ambigüedad.
 */
function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value ? String(value) : "";
}

function shapeProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? ""),
    status: String(row.status ?? ""),
    phone: row.phone ? String(row.phone) : null,
    jobTitle: row.job_title ? String(row.job_title) : null,
    bio: row.bio ? String(row.bio) : null,
    timezone: String(row.timezone ?? "America/Bogota"),
    locale: String(row.locale ?? "es"),
    // `hire_date::text` en el SELECT, no el `Date` que devolvería `pg` por
    // defecto: una columna DATE (sin hora) convertida a `Date` de JS puede
    // desalinearse un día según la zona horaria del proceso Node — mismo
    // problema ya documentado para `leads.next_follow_up_at`.
    hireDate: row.hire_date ? String(row.hire_date) : null,
    avatar: (row.avatar_variants as AvatarVariants | null) ?? null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

/**
 * Perfil de una persona SIN datos financieros (`hourly_cost`,
 * `weekly_hours_capacity`) a propósito — esta función la consume la
 * pantalla de autogestión (`/dashboard/cuenta`, `/portal/cuenta`), y lo que
 * devuelve viaja al navegador de esa persona dentro del payload de RSC. El
 * costo/hora es el dato que la agencia usa para calcular márgenes, no algo
 * que deba ir en la carga útil de la propia cuenta. La ficha de admin
 * (`/dashboard/equipo/[id]`, gateada por `team:read`) usa
 * `getTeamMemberDetail()` en team.ts, que sí los incluye.
 */
export async function getUserProfile(userId: number | string): Promise<UserProfile | null> {
  const res = await query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1;`, [userId]);
  return res.rows[0] ? shapeProfile(res.rows[0]) : null;
}

export interface OwnProfileInput {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  timezone?: string;
  locale?: string;
}

/**
 * Autogestión: lo que una persona puede cambiar de sí misma, sin pasar por
 * RBAC (mismo criterio que 2FA o revocar la sesión propia). Deliberadamente
 * NO acepta `email`, `role`, `status`, `job_title` ni `hire_date`: son
 * datos que fija la organización, no el individuo — `email` además es la
 * identidad de login, cambiarlo sin verificación sería una vía para
 * secuestrar la propia cuenta hacia un correo no confirmado.
 *
 * El `userId` siempre lo pone el llamador desde `session.id`, nunca desde
 * el body de la petición.
 */
export async function updateOwnProfile(
  userId: number | string,
  data: OwnProfileInput,
  dbRunner: QueryRunner
): Promise<UserProfile | null> {
  const res = await dbRunner.query(
    `UPDATE users SET
       name = COALESCE($1, name),
       phone = CASE WHEN $2 THEN $3 ELSE phone END,
       bio = CASE WHEN $4 THEN $5 ELSE bio END,
       timezone = COALESCE($6, timezone),
       locale = COALESCE($7, locale),
       updated_at = now()
     WHERE id = $8
     RETURNING ${PROFILE_COLUMNS};`,
    [
      data.name ?? null,
      // `CASE WHEN <vino el campo>` y no `COALESCE`: para `phone`/`bio` hay
      // que poder distinguir "no lo mandó" (no tocar) de "lo mandó vacío"
      // (borrarlo) — `COALESCE` colapsaría ambos casos en "no tocar", y
      // entonces un campo nunca se podría limpiar. Mismo truco que usa
      // `updateTeamMember()` con `hourly_cost`.
      data.phone !== undefined,
      data.phone ?? null,
      data.bio !== undefined,
      data.bio ?? null,
      data.timezone ?? null,
      data.locale ?? null,
      userId,
    ]
  );
  return res.rows[0] ? shapeProfile(res.rows[0]) : null;
}

/**
 * Guarda el avatar recién subido y devuelve la clave del anterior (o
 * `null`) para que el llamador borre esos objetos del bucket DESPUÉS de
 * que la transacción commitee — mismo orden que sigue el borrado de
 * documentos: se prefiere un objeto huérfano en el bucket (invisible) a
 * una fila apuntando a un archivo que la transacción podría revertir.
 */
export async function setUserAvatar(
  userId: number | string,
  avatar: { storageKey: string; variants: AvatarVariants },
  dbRunner: QueryRunner
): Promise<string | null> {
  // La clave anterior se lee en su propia sentencia antes del UPDATE (mismo
  // patrón `before`/`after` de `updateTeamMember`) y no con un sub-SELECT
  // dentro del RETURNING: ahí dependería de la semántica de snapshot de
  // Postgres dentro de una misma sentencia, que funciona pero es sutil y
  // fácil de romper sin darse cuenta al editar la consulta.
  const previous = await dbRunner.query("SELECT avatar_storage_key FROM users WHERE id = $1;", [userId]);
  if (previous.rows.length === 0) return null;

  await dbRunner.query(
    `UPDATE users SET avatar_storage_key = $1, avatar_variants = $2, updated_at = now() WHERE id = $3;`,
    [avatar.storageKey, JSON.stringify(avatar.variants), userId]
  );
  const previousKey = previous.rows[0].avatar_storage_key;
  return previousKey ? String(previousKey) : null;
}

/** Quita el avatar y devuelve la clave que había, para borrar sus archivos tras el commit. */
export async function clearUserAvatar(userId: number | string, dbRunner: QueryRunner): Promise<string | null> {
  const previous = await dbRunner.query("SELECT avatar_storage_key FROM users WHERE id = $1;", [userId]);
  if (previous.rows.length === 0) return null;

  await dbRunner.query(
    `UPDATE users SET avatar_storage_key = NULL, avatar_variants = NULL, updated_at = now() WHERE id = $1;`,
    [userId]
  );
  const previousKey = previous.rows[0].avatar_storage_key;
  return previousKey ? String(previousKey) : null;
}

/** El hash actual, para verificar la contraseña vigente antes de permitir cambiarla. Única función de este módulo que toca `password_hash`. */
export async function getUserPasswordHash(userId: number | string): Promise<string | null> {
  const res = await query("SELECT password_hash FROM users WHERE id = $1;", [userId]);
  return res.rows[0] ? String(res.rows[0].password_hash) : null;
}

/**
 * Rota el hash y revoca TODAS las demás sesiones de esa persona, dejando
 * viva solo la actual — si alguien cambia su contraseña porque sospecha
 * que se la robaron, dejar las otras sesiones abiertas haría inútil el
 * cambio. Mismo efecto que ya tiene `consumeResetToken()` en el flujo de
 * "olvidé mi contraseña", con la diferencia de que allá se revocan todas
 * (no hay sesión actual que preservar, se crea una nueva después).
 *
 * El `UPDATE sessions` va inline con el mismo `dbRunner` en vez de llamar a
 * `revokeOtherSessions()` de queries/sessions.ts: esa usa el pool global y
 * no podría entrar en esta transacción, y acá las dos escrituras tienen que
 * confirmarse juntas o ninguna.
 */
export async function changeUserPassword(
  userId: number | string,
  newPasswordHash: string,
  currentSessionId: string,
  dbRunner: QueryRunner
): Promise<void> {
  await dbRunner.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2;", [
    newPasswordHash,
    userId,
  ]);
  await dbRunner.query(
    "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL;",
    [userId, currentSessionId]
  );
}
