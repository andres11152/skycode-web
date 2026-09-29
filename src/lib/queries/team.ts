import { query } from "../db";
import type { TeamMember, TeamMemberDetail } from "@/components/dashboard/types";

/**
 * Compartida entre `/api/team` (GET) y `dashboard/equipo/page.tsx`.
 * Excluye `role = 'client'` a propósito: esta es la lista del equipo
 * interno, los clientes de portal se gestionan aparte (ver `clients`).
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await query(
    `SELECT id, name, email, role, status, hourly_cost, hourly_cost_currency, weekly_hours_capacity, created_at
     FROM users WHERE role != 'client' ORDER BY created_at ASC;`
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: row.role as TeamMember["role"],
    status: row.status as TeamMember["status"],
    hourly_cost: row.hourly_cost !== null && row.hourly_cost !== undefined ? Number(row.hourly_cost) : null,
    hourly_cost_currency: (row.hourly_cost_currency as TeamMember["hourly_cost_currency"]) ?? "COP",
    weekly_hours_capacity: Number(row.weekly_hours_capacity),
    created_at: String(row.created_at ?? ""),
  }));
}

/**
 * Quién puede quedar como dueño de un lead: admin y sales_manager, los
 * únicos roles con permiso `leads:write` — un traffiker o un cliente no
 * aparecen en el selector de asignación aunque estén activos.
 */
export async function getAssignableLeadOwners(): Promise<{ id: number; name: string; email: string }[]> {
  const res = await query(
    `SELECT id, name, email FROM users WHERE role IN ('admin', 'sales_manager') AND status = 'active' ORDER BY name ASC;`
  );
  return res.rows;
}

/**
 * Todo el equipo interno activo (los 3 roles no-client), para el selector
 * de responsable de una tarea — a diferencia de `getAssignableLeadOwners`,
 * acá sí entra `traffiker`: cualquiera del equipo puede tener tareas
 * asignadas, no solo quien vende.
 */
export async function getActiveTeamMembers(): Promise<{ id: number; name: string; email: string }[]> {
  const res = await query(
    `SELECT id, name, email FROM users WHERE role != 'client' AND status = 'active' ORDER BY name ASC;`
  );
  return res.rows;
}

interface QueryRunner {
  query: typeof query;
}

export interface UpdateTeamMemberParams {
  id: number;
  role?: string;
  status?: string;
  hourlyCost?: number | null;
  hourlyCostCurrency?: string;
  weeklyHoursCapacity?: number;
  // Datos de persona que fija la organización, no el individuo — por eso
  // viven acá (ruta gateada por `team:write`) y no en `updateOwnProfile()`.
  name?: string;
  email?: string;
  phone?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
}

/**
 * Actualiza los datos administrables de un miembro del equipo: rol,
 * estado, costo por hora, capacidad semanal y su ficha de persona
 * (nombre, correo, teléfono, cargo, fecha de ingreso).
 *
 * Dos efectos secundarios sobre sesiones, por el mismo motivo de fondo (si
 * cambia quién eres o si puedes entrar, las sesiones vivas dejan de ser
 * válidas): `status = 'disabled'` revoca las sesiones activas, y cambiar
 * el `email` también — es la identidad de login de esa persona.
 *
 * Si el correo nuevo ya existe, Postgres lanza el `UNIQUE` de la columna
 * (código 23505) y la ruta lo traduce a un 409 legible en vez de un 500.
 */
export async function updateTeamMember(
  {
    id,
    role,
    status,
    hourlyCost,
    hourlyCostCurrency,
    weeklyHoursCapacity,
    name,
    email,
    phone,
    jobTitle,
    hireDate,
  }: UpdateTeamMemberParams,
  dbRunner: QueryRunner
) {
  const before = await dbRunner.query(
    `SELECT id, name, email, role, status, hourly_cost, hourly_cost_currency, weekly_hours_capacity,
            phone, job_title, hire_date::text AS hire_date
     FROM users WHERE id = $1;`,
    [id]
  );
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE users SET
       role = COALESCE($1, role),
       status = COALESCE($2, status),
       hourly_cost = CASE WHEN $3 THEN $4 ELSE hourly_cost END,
       hourly_cost_currency = COALESCE($5, hourly_cost_currency),
       weekly_hours_capacity = COALESCE($6, weekly_hours_capacity),
       name = COALESCE($8, name),
       email = COALESCE($9, email),
       phone = CASE WHEN $10 THEN $11 ELSE phone END,
       job_title = CASE WHEN $12 THEN $13 ELSE job_title END,
       hire_date = CASE WHEN $14 THEN $15::date ELSE hire_date END,
       updated_at = now()
     WHERE id = $7
     RETURNING id, name, email, role, status, hourly_cost, hourly_cost_currency, weekly_hours_capacity,
               phone, job_title, hire_date::text AS hire_date, created_at;`,
    [
      role ?? null,
      status ?? null,
      hourlyCost !== undefined,
      hourlyCost ?? null,
      hourlyCostCurrency ?? null,
      weeklyHoursCapacity ?? null,
      id,
      name ?? null,
      email ?? null,
      // `CASE WHEN <vino el campo>` para los tres opcionales que se pueden
      // querer BORRAR: con `COALESCE` mandar `null` significaría "no tocar"
      // y el campo nunca se podría limpiar.
      phone !== undefined,
      phone ?? null,
      jobTitle !== undefined,
      jobTitle ?? null,
      hireDate !== undefined,
      hireDate ?? null,
    ]
  );

  // Desactivar la cuenta o cambiarle el correo invalidan las sesiones
  // vivas: en el primer caso la persona ya no debería poder entrar, y en
  // el segundo su identidad de login cambió bajo sus pies.
  const emailChanged = email !== undefined && email !== before.rows[0].email;
  if (status === "disabled" || emailChanged) {
    await dbRunner.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;`, [id]);
  }

  return { before: before.rows[0], after: res.rows[0] };
}

/**
 * Ficha completa para `/dashboard/equipo/[id]` — a diferencia de
 * `getUserProfile()` (autogestión), acá SÍ salen costo por hora y
 * capacidad semanal, porque esta consulta solo la alcanza una ruta gateada
 * por `team:read` (admin). `totp_enabled` se expone como booleano; el
 * secreto y los códigos de respaldo nunca salen de la base.
 */
export async function getTeamMemberDetail(id: number): Promise<TeamMemberDetail | null> {
  const res = await query(
    `SELECT id, name, email, role, status, phone, job_title, bio, timezone, locale,
            hire_date::text AS hire_date, avatar_variants, hourly_cost, hourly_cost_currency,
            weekly_hours_capacity, totp_enabled, created_at, updated_at
     FROM users WHERE id = $1;`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;

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
    hireDate: row.hire_date ? String(row.hire_date) : null,
    avatar: (row.avatar_variants as TeamMemberDetail["avatar"]) ?? null,
    hourlyCost: row.hourly_cost !== null && row.hourly_cost !== undefined ? Number(row.hourly_cost) : null,
    hourlyCostCurrency: (row.hourly_cost_currency as TeamMemberDetail["hourlyCostCurrency"]) ?? "COP",
    weeklyHoursCapacity: Number(row.weekly_hours_capacity),
    totpEnabled: Boolean(row.totp_enabled),
    // ISO-8601, no `String(Date)` — ver `toIsoString()` en queries/userProfile.ts.
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ""),
  };
}

export interface CreateInviteParams {
  id: string;
  email: string;
  role: string;
  invitedBy: number | string;
  expiresAt: Date;
}

/**
 * Inserta una invitación para unirse al equipo interno.
 */
export async function createTeamInvite({ id, email, role, invitedBy, expiresAt }: CreateInviteParams) {
  await query(
    `INSERT INTO invites (id, email, role, invited_by, expires_at) VALUES ($1, $2, $3, $4, $5);`,
    [id, email.toLowerCase(), role, invitedBy, expiresAt]
  );
}

export interface InviteRow {
  id: string;
  email: string;
  role: string;
}

/**
 * Busca una invitación válida (no aceptada y no expirada).
 */
export async function findValidInvite(token: string): Promise<InviteRow | null> {
  const res = await query(
    `SELECT id, email, role FROM invites WHERE id = $1 AND accepted_at IS NULL AND expires_at > now();`,
    [token]
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    email: String(row.email),
    role: String(row.role),
  };
}

export interface AcceptInviteParams {
  token: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}

/**
 * Crea el usuario de equipo y marca la invitación como aceptada dentro de una transacción.
 */
export async function acceptTeamInviteAndCreateUser(
  { token, name, email, passwordHash, role }: AcceptInviteParams,
  dbRunner: QueryRunner
) {
  const userRes = await dbRunner.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role;`,
    [name, email, passwordHash, role]
  );
  const newUser = userRes.rows[0];

  await dbRunner.query(`UPDATE invites SET accepted_at = now() WHERE id = $1;`, [token]);

  return {
    id: Number(newUser.id),
    name: String(newUser.name),
    email: String(newUser.email),
    role: String(newUser.role),
  };
}


