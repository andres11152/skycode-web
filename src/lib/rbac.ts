export type Role = "admin" | "sales_manager" | "traffiker" | "client";

export type Permission =
  | "leads:read"
  | "leads:write"
  | "projects:read"
  | "projects:write"
  | "audit:read"
  | "team:read"
  | "team:write"
  | "campaigns:read"
  | "campaigns:write"
  | "proposals:read"
  | "proposals:write"
  | "invoices:read"
  | "invoices:write"
  | "profitability:read";

/**
 * Única fuente de verdad de "quién puede hacer qué". Un endpoint nuevo
 * declara el permiso que exige acá en vez de comparar `session.role` a
 * mano — ese patrón disperso ya causó un fallo de autorización real en
 * este proyecto (dos endpoints verificaban la sesión pero olvidaban el rol).
 *
 * `client` no tiene permisos propios acá a propósito: su acceso a
 * proyectos es por dueño (`users.client_id` → `projects.client_id`), no
 * por rol — ver la rama dedicada en `/api/projects`. La propuesta pública
 * (`/propuesta/[id]`) tampoco pasa por acá: se accede por posesión del
 * enlace UUID, no por sesión. `team:*` es exclusivo de admin. `invoices:write`
 * es solo admin — un sales_manager lee cobranza pero no la gestiona (la
 * matriz original pedía "sus ventas, lectura"; sin trazabilidad
 * lead→proyecto todavía, se simplificó a lectura de todo, no solo lo
 * propio — ver nota en lib/queries/invoices.ts). Registrar horas propias
 * tampoco pasa por acá: es por identidad (cualquier rol interno registra
 * las suyas), no por permiso — `profitability:read` es solo para VER el
 * reporte con costos y horas de todo el equipo, exclusivo de admin.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set([
    "leads:read",
    "leads:write",
    "projects:read",
    "projects:write",
    "audit:read",
    "team:read",
    "team:write",
    "campaigns:read",
    "campaigns:write",
    "proposals:read",
    "proposals:write",
    "invoices:read",
    "invoices:write",
    "profitability:read",
  ]),
  sales_manager: new Set([
    "leads:read",
    "leads:write",
    "projects:read",
    "campaigns:read",
    "proposals:read",
    "proposals:write",
    "invoices:read",
  ]),
  traffiker: new Set(["campaigns:read", "campaigns:write"]),
  client: new Set([]),
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role];
  return permissions ? permissions.has(permission) : false;
}

export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}
