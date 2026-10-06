import {
  LayoutDashboard,
  TrendingUp,
  Layers,
  Users2,
  Megaphone,
  FileText,
  Receipt,
  Clock,
  BarChart3,
  Building2,
  History,
  KeyRound,
  LifeBuoy,
  Gauge,
  Wallet,
  Settings2,
  Search,
  PenSquare,
  LineChart,
  Repeat,
  PieChart,
  ClipboardCheck,
  Briefcase,
  IdCard,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Agrupado por dominio de negocio, no una fila plana de 8+ ítems — a esa
 * cantidad un nav horizontal ya no es usable, y cada módulo nuevo lo
 * empeora. Un grupo entero desaparece si ningún ítem suyo pasa el filtro
 * de permiso (ver `visibleGroups` abajo) — no queda un encabezado vacío.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Comercial",
    items: [
      { href: "/dashboard/leads", label: "Leads y Ventas", icon: TrendingUp, permission: "leads:read" },
      { href: "/dashboard/propuestas", label: "Propuestas", icon: FileText, permission: "proposals:read" },
      { href: "/dashboard/campanas", label: "Campañas", icon: Megaphone, permission: "campaigns:read" },
      { href: "/dashboard/seo", label: "SEO", icon: Search, permission: "seo:read" },
      { href: "/dashboard/contenido", label: "Contenido", icon: PenSquare, permission: "content:read" },
      // Mismo criterio que Contenido/SEO — publicar el portafolio público
      // es una decisión estratégica de marca, no un módulo operativo.
      { href: "/dashboard/portafolio", label: "Portafolio", icon: Briefcase, permission: "portfolio:read" },
      // Fichas de la página pública /equipo (marca, no administración de
      // cuentas — eso es "Equipo" en Administración). Ruta propia y no
      // /dashboard/equipo/..., porque el resaltado del nav usa startsWith
      // y encendería los dos ítems a la vez.
      { href: "/dashboard/perfiles-publicos", label: "Perfiles públicos", icon: IdCard, permission: "team:read" },
    ],
  },
  {
    label: "Clientes",
    items: [{ href: "/dashboard/clientes", label: "Clientes", icon: Building2, permission: "clients:read" }],
  },
  {
    label: "Entrega",
    items: [
      { href: "/dashboard/proyectos", label: "Proyectos", icon: Layers, permission: "projects:read" },
      // Mismo permiso que "Proyectos" a propósito: registrar horas exige
      // poder ver proyectos (ver /api/time-entries::canLogTime).
      { href: "/dashboard/horas", label: "Mis Horas", icon: Clock, permission: "projects:read" },
      // Mismo permiso que el tablero de tareas por proyecto — hoy nadie sin
      // tasks:read tiene forma de ver ni siquiera la página de un proyecto
      // donde se le asignó algo (ver GET /api/tasks/mine).
      { href: "/dashboard/mis-tareas", label: "Mis Tareas", icon: ClipboardCheck, permission: "tasks:read" },
      { href: "/dashboard/soporte", label: "Soporte", icon: LifeBuoy, permission: "support:read" },
      // Reutiliza tasks:read — es una vista derivada de las mismas
      // asignaciones que ya gatea ese permiso (ver capacidad/page.tsx).
      { href: "/dashboard/capacidad", label: "Capacidad", icon: Gauge, permission: "tasks:read" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard/facturacion", label: "Facturación", icon: Receipt, permission: "invoices:read" },
      // Mismo permiso que Facturación — un retainer es una configuración
      // de facturación recurrente, no un módulo aparte (ver page.tsx).
      { href: "/dashboard/retainers", label: "Retainers", icon: Repeat, permission: "invoices:read" },
      { href: "/dashboard/gastos", label: "Gastos", icon: Wallet, permission: "expenses:read" },
      { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: BarChart3, permission: "profitability:read" },
      // Mismo permiso que Rentabilidad a propósito — mismo tipo de dato
      // financiero agregado de toda la agencia (ver page.tsx).
      { href: "/dashboard/proyeccion-caja", label: "Proyección de Caja", icon: LineChart, permission: "profitability:read" },
      // Mismo permiso que Rentabilidad/Proyección de caja — otro reporte
      // financiero/comercial agregado, no un módulo operativo aparte.
      { href: "/dashboard/reportes", label: "Reportes Ejecutivos", icon: PieChart, permission: "profitability:read" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/dashboard/equipo", label: "Equipo", icon: Users2, permission: "team:read" },
      // Mismo permiso que "Equipo" a propósito: quien administra personas
      // debe poder ver qué puede hacer cada rol (ver rbac.ts::getRolePermissions).
      { href: "/dashboard/roles", label: "Roles y Permisos", icon: KeyRound, permission: "team:read" },
      { href: "/dashboard/auditoria", label: "Auditoría", icon: History, permission: "audit:read" },
      { href: "/dashboard/configuracion", label: "Configuración", icon: Settings2, permission: "settings:write" },
    ],
  },
];


/** Grupos con solo los ítems que el rol puede ver; un grupo vacío desaparece. */
export function getVisibleGroups(role: string): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}

/**
 * Accesos de la barra inferior en móvil: los módulos de uso diario, en este
 * orden de prioridad, filtrados por lo que el rol puede ver. Con "Inicio" y
 * "Más" (que abre el menú completo) caben 5 sin apretar.
 */
const BOTTOM_NAV_PRIORITY = [
  "/dashboard/leads",
  "/dashboard/proyectos",
  "/dashboard/propuestas",
  "/dashboard/campanas",
  "/dashboard/facturacion",
  "/dashboard/soporte",
] as const;

export function getBottomNavItems(role: string): NavItem[] {
  const all = NAV_GROUPS.flatMap((g) => g.items).filter((item) => hasPermission(role, item.permission));
  return BOTTOM_NAV_PRIORITY.map((href) => all.find((i) => i.href === href)).filter((i): i is NavItem => Boolean(i)).slice(0, 3);
}
