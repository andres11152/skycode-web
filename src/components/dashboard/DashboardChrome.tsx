"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck, TrendingUp, Layers, Users2, Megaphone, FileText, Receipt, Clock, BarChart3 } from "lucide-react";
import { hasPermission } from "@/lib/rbac";
import type { SessionUser } from "./types";

const NAV_ITEMS = [
  { href: "/dashboard/leads", label: "Leads y Ventas", icon: TrendingUp, permission: "leads:read" as const },
  { href: "/dashboard/proyectos", label: "Gestión de Proyectos", icon: Layers, permission: "projects:read" as const },
  { href: "/dashboard/campanas", label: "Campañas", icon: Megaphone, permission: "campaigns:read" as const },
  { href: "/dashboard/propuestas", label: "Propuestas", icon: FileText, permission: "proposals:read" as const },
  { href: "/dashboard/facturacion", label: "Facturación", icon: Receipt, permission: "invoices:read" as const },
  // Mismo permiso que "Gestión de Proyectos" a propósito: registrar horas
  // exige poder ver proyectos (ver /api/time-entries::canLogTime).
  { href: "/dashboard/horas", label: "Mis Horas", icon: Clock, permission: "projects:read" as const },
  { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: BarChart3, permission: "profitability:read" as const },
  { href: "/dashboard/equipo", label: "Equipo", icon: Users2, permission: "team:read" as const },
];

export function DashboardChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(user.role, item.permission));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="border-b border-background/10 bg-background/5 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="h-4 w-px bg-background/20" />
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent">
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

        {visibleItems.length > 1 && (
          <nav className="mx-auto flex max-w-7xl gap-6 px-6" aria-label="Secciones del panel">
            {visibleItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 pb-3.5 pt-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground ${
                    active
                      ? "border-accent text-accent font-bold"
                      : "border-transparent text-background/50 hover:text-background"
                  }`}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">{children}</main>
    </div>
  );
}
