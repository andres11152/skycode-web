"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
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
  UserCircle,
  LifeBuoy,
  Gauge,
  Wallet,
  Settings2,
  Menu,
  X,
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
import { NotificationBell } from "./NotificationBell";
import { UserAvatar } from "./UserAvatar";
import { roleLabel } from "./roleLabels";
import type { SessionUser } from "./types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Agrupado por dominio de negocio, no una fila plana de 8+ ítems — a esa
 * cantidad un nav horizontal ya no es usable, y cada módulo nuevo lo
 * empeora. Un grupo entero desaparece si ningún ítem suyo pasa el filtro
 * de permiso (ver `visibleGroups` abajo) — no queda un encabezado vacío.
 */
const NAV_GROUPS: NavGroup[] = [
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

function SidebarNav({ role, pathname, onNavigate }: { role: string; pathname: string; onNavigate?: () => void }) {
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-6" aria-label="Secciones del panel">
      <div className="flex flex-col gap-0.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            pathname === "/dashboard" ? "bg-accent/15 text-accent" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          }`}
        >
          <LayoutDashboard size={16} />
          Inicio
        </Link>

        {/* Sin `permission` a propósito, como "Inicio": es autogestión de
            la propia cuenta (ver sesiones, cerrarlas), no un módulo de
            negocio gateado por rol — cualquier persona autenticada la ve. */}
        <Link
          href="/dashboard/cuenta"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            pathname.startsWith("/dashboard/cuenta") ? "bg-accent/15 text-accent" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          }`}
        >
          <UserCircle size={16} />
          Mi Cuenta
        </Link>
      </div>

      {visibleGroups.map((group) => (
        <div key={group.label}>
          <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/40">
            {group.label}
          </span>
          <div className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active ? "bg-accent/15 text-accent font-semibold" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DashboardChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
              aria-label="Abrir menú del panel"
            >
              <Menu size={20} />
            </button>
            <Link
              href="/"
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="hidden h-4 w-px bg-foreground/20 sm:block" />
            <span className="hidden rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent sm:inline-block">
              SKYCODE Command Center
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* La identidad del header lleva a "Mi Cuenta" — el patrón que
                cualquiera espera de un panel (clic en tu nombre/foto = tu
                perfil), en vez de un texto inerte. */}
            <Link
              href="/dashboard/cuenta"
              aria-label={`Mi cuenta: ${user.name}, ${roleLabel(user.role)}`}
              className="hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-xs transition-colors hover:bg-foreground/5 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex"
            >
              <UserAvatar name={user.name} src={user.avatarUrl} size="sm" decorative />
              <span className="flex flex-col leading-tight">
                <span className="font-semibold text-foreground">{user.name}</span>
                <span className="text-[10px] text-foreground/70">{roleLabel(user.role)}</span>
              </span>
            </Link>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar de escritorio — fija, con su propio scroll si el nav crece más que el viewport. */}
        <aside className="hidden shrink-0 border-r border-foreground/10 bg-background px-4 py-6 lg:block lg:w-64">
          <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto pb-6">
            <SidebarNav role={user.role} pathname={pathname} />
          </div>
        </aside>

        {/* Drawer móvil — mismo contenido de nav, deslizante desde la izquierda con backdrop. */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-foreground/10 bg-background px-4 py-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-7 w-auto" />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/80 hover:bg-foreground/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Cerrar menú del panel"
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarNav role={user.role} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 space-y-8">{children}</main>
      </div>
    </div>
  );
}
