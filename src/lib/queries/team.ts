import { query } from "../db";
import type { TeamMember } from "@/components/dashboard/types";

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
}

/**
 * Actualiza rol, estado, costo por hora o capacidad semanal de un
 * miembro del equipo. Si el estado es 'disabled', revoca sus sesiones
 * activas.
 */
export async function updateTeamMember(
  { id, role, status, hourlyCost, hourlyCostCurrency, weeklyHoursCapacity }: UpdateTeamMemberParams,
  dbRunner: QueryRunner
) {
  const before = await dbRunner.query(
    "SELECT id, name, email, role, status, hourly_cost, hourly_cost_currency, weekly_hours_capacity FROM users WHERE id = $1;",
    [id]
  );
  if (before.rows.length === 0) return null;

  const res = await dbRunner.query(
    `UPDATE users SET
       role = COALESCE($1, role),
       status = COALESCE($2, status),
       hourly_cost = CASE WHEN $3 THEN $4 ELSE hourly_cost END,
       hourly_cost_currency = COALESCE($5, hourly_cost_currency),
       weekly_hours_capacity = COALESCE($6, weekly_hours_capacity)
     WHERE id = $7
     RETURNING id, name, email, role, status, hourly_cost, hourly_cost_currency, weekly_hours_capacity, created_at;`,
    [
      role ?? null,
      status ?? null,
      hourlyCost !== undefined,
      hourlyCost ?? null,
      hourlyCostCurrency ?? null,
      weeklyHoursCapacity ?? null,
      id,
    ]
  );

  if (status === "disabled") {
    await dbRunner.query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;`, [id]);
  }

  return { before: before.rows[0], after: res.rows[0] };
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


