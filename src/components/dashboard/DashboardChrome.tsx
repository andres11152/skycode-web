"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ShieldCheck,
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
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/rbac";
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
      { href: "/dashboard/gastos", label: "Gastos", icon: Wallet, permission: "expenses:read" },
      { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: BarChart3, permission: "profitability:read" },
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
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground ${
            pathname === "/dashboard" ? "bg-accent/15 text-accent" : "text-background/70 hover:bg-background/10 hover:text-background"
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
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground ${
            pathname.startsWith("/dashboard/cuenta") ? "bg-accent/15 text-accent" : "text-background/70 hover:bg-background/10 hover:text-background"
          }`}
        >
          <UserCircle size={16} />
          Mi Cuenta
        </Link>
      </div>

      {visibleGroups.map((group) => (
        <div key={group.label}>
          <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-background/40">
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
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground ${
                    active ? "bg-accent/15 text-accent font-semibold" : "text-background/70 hover:bg-background/10 hover:text-background"
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
    <div className="min-h-screen bg-foreground text-background">
      <header className="border-b border-background/10 bg-background/5 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground lg:hidden"
              aria-label="Abrir menú del panel"
            >
              <Menu size={20} />
            </button>
            <Link
              href="/"
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="hidden h-4 w-px bg-background/20 sm:block" />
            <span className="hidden rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent sm:inline-block">
              SKYCODE Command Center
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-background/80 font-mono">
              <ShieldCheck size={14} className="text-green-400" />
              <span>{user.name}</span>
              <span className="rounded bg-background/10 px-1.5 py-0.5 text-[10px] uppercase text-background/60">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-background/15 px-3 py-1.5 text-xs text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar de escritorio — fija, con su propio scroll si el nav crece más que el viewport. */}
        <aside className="hidden shrink-0 border-r border-background/10 px-4 py-6 lg:block lg:w-64">
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
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-background/10 bg-foreground px-4 py-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-7 w-auto" />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-background/80 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
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
