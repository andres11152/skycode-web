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
  | "profitability:read"
  | "clients:read"
  | "clients:write"
  | "tasks:read"
  | "tasks:write"
  | "support:read"
  | "support:write"
  | "documents:read"
  | "documents:write"
  | "expenses:read"
  | "expenses:write"
  | "settings:write"
  | "seo:read"
  | "content:read"
  | "content:write"
  | "data_privacy:manage"
  | "portfolio:read"
  | "portfolio:write";

export const ALL_ROLES = ["admin", "sales_manager", "traffiker", "client"] as const satisfies readonly Role[];

// `satisfies` valida que cada elemento sea un `Permission` real, pero no
// obliga a que el array cubra el tipo completo — si agregas un permiso
// nuevo, agrégalo también acá (lo mismo que ya exige `rbac.test.ts` con su
// propio `ALL_PERMISSIONS` duplicado). Usado por /dashboard/roles para
// mostrar la matriz completa sin adivinar qué permisos existen.
export const ALL_PERMISSIONS = [
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
  "clients:read",
  "clients:write",
  "tasks:read",
  "tasks:write",
  "support:read",
  "support:write",
  "documents:read",
  "documents:write",
  "expenses:read",
  "expenses:write",
  "settings:write",
  "seo:read",
  "content:read",
  "content:write",
  "data_privacy:manage",
  "portfolio:read",
  "portfolio:write",
] as const satisfies readonly Permission[];

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
 * `clients:*` gatea la ficha 360 (`/dashboard/clientes`) — la fila de
 * `clients` en sí se sigue creando implícitamente al crear un proyecto o
 * aceptar una propuesta (upsert por email), esto solo gatea consultarla y
 * editar sus datos de contacto (nombre, empresa, teléfono, notas).
 * `tasks:*` gatea la gestión de tareas (crear, asignar, editar, borrar)
 * dentro de un proyecto — quien solo tiene `tasks:read` puede ver el
 * tablero pero no tocar nada. Aparte de esto, cualquier usuario interno
 * puede cambiar el **estado** de una tarea que tiene asignada a sí mismo
 * sin tener `tasks:write` — es autogestión por identidad (mismo criterio
 * que registrar horas propias), resuelto en la propia ruta, no acá.
 * `support:*` gatea los tickets de soporte post-lanzamiento
 * (`/dashboard/soporte`) — alcance interno por ahora (el equipo abre y
 * resuelve incidencias contra un proyecto), el cliente todavía no abre
 * tickets desde `/portal` (eso es "Portal ampliado", una fase posterior).
 * `documents:*` gatea subir/descargar/borrar documentos de un proyecto
 * (contratos, especificaciones, entregables) — mismo alcance interno que
 * `support:*` y `tasks:*`, el cliente todavía no los descarga desde
 * `/portal` (también "Portal ampliado").
 * `expenses:*` es exclusivo de admin (no de sales_manager, a diferencia de
 * `clients:*`/`tasks:*`/`support:*`/`documents:*`) — mismo criterio que
 * `profitability:read`: son costos reales de la agencia (licencias,
 * infraestructura, subcontratos), y el reporte de rentabilidad que los
 * consume ya es admin-only. Un sales_manager no necesita ver cuánto cuesta
 * operar la agencia para hacer su trabajo.
 * `settings:write` es un permiso único (no un par read/write) — gatea
 * `/dashboard/configuracion` completo, tanto para ver como para editar,
 * porque solo admin necesita verlo alguna vez. No hay `settings:read`
 * separado a propósito, a diferencia de todos los demás módulos.
 * `seo:read` gatea `/dashboard/seo` (métricas de Google Search Console
 * ingeridas por el cron `/api/cron/seo-pulse`, ver lib/queries/seoMetrics.ts)
 * — exclusivo de admin, mismo criterio que `profitability:read`/`expenses:*`:
 * es visibilidad estratégica de todo el sitio, no un módulo operativo de
 * un rol concreto. Sin `seo:write` a propósito, como `audit:read` — es un
 * reporte de solo lectura, los datos solo entran vía el cron.
 * `content:*` gatea `/dashboard/contenido` (borradores de blog generados
 * por el cron `/api/cron/content-pulse` o creados a mano, revisión y
 * publicación — ver lib/queries/articles.ts) — exclusivo de admin, mismo
 * criterio que `seo:*`: publicar contenido público del sitio es una
 * decisión estratégica de marca, no un módulo operativo delegable.
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
    "clients:read",
    "clients:write",
    "tasks:read",
    "tasks:write",
    "support:read",
    "support:write",
    "documents:read",
    "documents:write",
    "expenses:read",
    "expenses:write",
    "settings:write",
    "seo:read",
    "content:read",
    "content:write",
    "data_privacy:manage",
    "portfolio:read",
    "portfolio:write",
  ]),
  sales_manager: new Set([
    "leads:read",
    "leads:write",
    "projects:read",
    "campaigns:read",
    "proposals:read",
    "proposals:write",
    "invoices:read",
    "clients:read",
    "clients:write",
    "tasks:read",
    "tasks:write",
    "support:read",
    "support:write",
    "documents:read",
    "documents:write",
  ]),
  traffiker: new Set(["campaigns:read", "campaigns:write"]),
  client: new Set([]),
};

/**
 * Permisos de un rol, para mostrar la matriz completa en
 * `/dashboard/roles` — nunca para tomar decisiones de autorización (eso
 * siempre pasa por `hasPermission`, permiso por permiso).
 */
export function getRolePermissions(role: Role): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role]);
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (!Object.hasOwn(ROLE_PERMISSIONS, role)) return false;
  return ROLE_PERMISSIONS[role as Role].has(permission);
}

export function isValidRole(role: string): role is Role {
  return Object.hasOwn(ROLE_PERMISSIONS, role);
}
