import { Check, Minus, ShieldCheck } from "lucide-react";
import { ALL_PERMISSIONS, ALL_ROLES, getRolePermissions, type Permission, type Role } from "@/lib/rbac";
import { ROLE_LABELS } from "./roleLabels";

const DOMAIN_LABELS: Record<string, string> = {
  leads: "Leads y Ventas",
  projects: "Proyectos",
  campaigns: "Campañas",
  proposals: "Propuestas",
  invoices: "Facturación",
  team: "Equipo",
  clients: "Clientes",
  audit: "Auditoría",
  profitability: "Rentabilidad",
  seo: "SEO",
  content: "Contenido",
  tasks: "Tareas",
  support: "Soporte",
  documents: "Documentos",
  expenses: "Gastos",
  settings: "Configuración",
  portfolio: "Portafolio",
  data_privacy: "Privacidad de datos",
};

const ACTION_LABELS: Record<string, string> = {
  read: "Ver",
  write: "Editar",
};

function groupPermissionsByDomain(permissions: readonly Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const [domain] = permission.split(":");
    const list = groups.get(domain) ?? [];
    list.push(permission);
    groups.set(domain, list);
  }
  return Array.from(groups.entries());
}

/**
 * Vista de solo lectura sobre `lib/rbac.ts` — nunca edita nada, la matriz
 * real solo se cambia en código (`ROLE_PERMISSIONS`) y se despliega, no
 * hay UI de administración de permisos. Esto existe para que quien
 * administra personas en /dashboard/equipo pueda ver qué puede hacer cada
 * rol sin tener que leer el archivo fuente.
 */
export function RolesMatrix() {
  const domainGroups = groupPermissionsByDomain(ALL_PERMISSIONS);
  const rolePermissionSets = Object.fromEntries(
    ALL_ROLES.map((role) => [role, new Set(getRolePermissions(role))])
  ) as Record<Role, Set<Permission>>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Roles y Permisos</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">
          Matriz real de <code className="font-mono text-foreground/90">lib/rbac.ts</code> — de solo lectura, se
          cambia en código, no acá
        </p>
      </div>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/70">
          <code className="font-mono text-foreground/70">client</code> no tiene permisos propios en esta matriz a
          propósito: su acceso a proyectos es por dueño (<code className="font-mono text-foreground/70">client_id</code>),
          no por rol.
        </p>
      </div>

      {/* Móvil: una tabla de 6 columnas no cabe; un acordeón por rol (<details>, sin JS) lista
          solo lo que ese rol SÍ puede hacer. La tabla completa queda para `md` en adelante. */}
      <div className="space-y-3 md:hidden">
        {ALL_ROLES.map((role) => {
          const granted = domainGroups
            .map(([domain, permissions]) => ({
              domain,
              actions: permissions.filter((p) => rolePermissionSets[role].has(p)).map((p) => ACTION_LABELS[p.split(":")[1]] ?? p.split(":")[1]),
            }))
            .filter((g) => g.actions.length > 0);
          const total = granted.reduce((n, g) => n + g.actions.length, 0);
          return (
            <details key={role} className="group rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {ROLE_LABELS[role]}
                <span className="text-xs font-normal text-foreground/70">{total === 0 ? "Sin permisos propios" : `${total} permisos`}</span>
              </summary>
              {granted.length > 0 && (
                <dl className="divide-y divide-foreground/10 border-t border-foreground/10 px-4">
                  {granted.map((g) => (
                    <div key={g.domain} className="flex items-baseline justify-between gap-3 py-2.5 text-xs">
                      <dt className="font-semibold text-foreground">{DOMAIN_LABELS[g.domain] ?? g.domain}</dt>
                      <dd className="text-right text-foreground/70">{g.actions.join(" · ")}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </details>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5 md:block">
        <div className="overflow-x-auto">
          <table data-keep-table className="w-full text-left text-xs text-foreground/90">
            <caption className="sr-only">Matriz de permisos por rol, agrupada por módulo</caption>
            <thead className="border-b border-foreground/10 bg-foreground/[0.025] font-mono uppercase text-[11px] text-foreground/70">
              <tr>
                <th scope="col" className="px-5 py-3.5">Módulo</th>
                <th scope="col" className="px-5 py-3.5">Acción</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-5 py-3.5 text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {domainGroups.map(([domain, permissions]) =>
                permissions.map((permission, i) => {
                  const [, action] = permission.split(":");
                  return (
                    <tr key={permission}>
                      {i === 0 && (
                        <td
                          rowSpan={permissions.length}
                          className="px-5 py-3 font-bold text-foreground align-top border-r border-foreground/10"
                        >
                          {DOMAIN_LABELS[domain] ?? domain}
                        </td>
                      )}
                      <td className="px-5 py-3 text-foreground/70 font-mono">{ACTION_LABELS[action] ?? action}</td>
                      {ALL_ROLES.map((role) => {
                        const granted = rolePermissionSets[role].has(permission);
                        return (
                          <td key={role} className="px-5 py-3 text-center">
                            {granted ? (
                              <><Check size={15} aria-hidden="true" className="inline text-success" /><span className="sr-only">Sí</span></>
                            ) : (
                              <><Minus size={15} aria-hidden="true" className="inline text-foreground/35" /><span className="sr-only">No</span></>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
