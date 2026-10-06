"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, UserCircle, Menu, X, Search, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { FeedbackProvider } from "./ui/Feedback";
import { TableEnhancer } from "./ui/TableEnhancer";
import { UserAvatar } from "./UserAvatar";
import { roleLabel } from "./roleLabels";
import { getBottomNavItems, getVisibleGroups } from "./navConfig";
import type { SessionUser } from "./types";

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const linkClass = (active: boolean, semibold = false) =>
  cn(
    "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors lg:min-h-9",
    FOCUS_RING,
    semibold ? "font-semibold" : "font-medium",
    active ? "bg-accent/15 text-accent-strong font-semibold" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
  );

function SidebarNav({ role, pathname, onNavigate }: { role: string; pathname: string; onNavigate?: () => void }) {
  const visibleGroups = getVisibleGroups(role);

  return (
    <nav className="flex flex-col gap-6" aria-label="Secciones del panel">
      <div className="flex flex-col gap-0.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={linkClass(pathname === "/dashboard", true)}
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          Inicio
        </Link>

        {/* Sin `permission` a propósito, como "Inicio": es autogestión de
            la propia cuenta (ver sesiones, cerrarlas), no un módulo de
            negocio gateado por rol — cualquier persona autenticada la ve. */}
        <Link
          href="/dashboard/cuenta"
          onClick={onNavigate}
          aria-current={pathname.startsWith("/dashboard/cuenta") ? "page" : undefined}
          className={linkClass(pathname.startsWith("/dashboard/cuenta"), true)}
        >
          <UserCircle size={16} aria-hidden="true" />
          Mi Cuenta
        </Link>
      </div>

      {visibleGroups.map((group) => (
        <div key={group.label}>
          <span className="px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-foreground/70">{group.label}</span>
          <div className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  <item.icon size={16} aria-hidden="true" />
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

/** Menú completo en móvil: Esc lo cierra, atrapa el foco y entra deslizándose. */
function MobileDrawer({
  role,
  pathname,
  onClose,
}: {
  role: string;
  pathname: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, panelRef);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú del panel"
        className="animate-enter-from-left absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto overscroll-contain border-r border-foreground/10 bg-background px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <Image src="/logo-mark.png" alt="SKYCODE" width={120} height={70} className="h-7 w-auto" />
          <button
            type="button"
            onClick={onClose}
            className={cn("flex h-11 w-11 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10", FOCUS_RING)}
            aria-label="Cerrar menú del panel"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarNav role={role} pathname={pathname} onNavigate={onClose} />
      </div>
    </div>
  );
}

/**
 * Barra inferior (solo móvil): 3 módulos de uso diario según el rol +
 * "Inicio" y "Más" (abre el menú completo). Es lo que se alcanza con el
 * pulgar; el menú lateral queda para lo demás.
 */
function BottomNav({
  role,
  pathname,
  onMore,
  inert,
}: {
  role: string;
  pathname: string;
  onMore: () => void;
  inert: boolean;
}) {
  const items = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, active: pathname === "/dashboard" },
    ...getBottomNavItems(role).map((item) => ({
      href: item.href,
      label: item.label.split(" ")[0],
      icon: item.icon,
      active: pathname.startsWith(item.href),
    })),
  ];
  const tab = "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors";

  return (
    <nav
      aria-label="Accesos rápidos"
      inert={inert}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(tab, "flex-1", FOCUS_RING, item.active ? "text-accent-strong" : "text-foreground/70")}
          >
            <item.icon size={20} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={onMore} className={cn(tab, "flex-1 text-foreground/70", FOCUS_RING)}>
          <MoreHorizontal size={20} aria-hidden="true" />
          Más
        </button>
      </div>
    </nav>
  );
}

export function DashboardChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // ⌘K / Ctrl+K abre la búsqueda desde cualquier pantalla del panel.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <FeedbackProvider toastOffsetClassName="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6">
      <TableEnhancer />
      <div className="min-h-screen bg-background text-foreground">
        <header
          inert={drawerOpen}
          className="sticky top-0 z-40 border-b border-foreground/10 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10 lg:hidden",
                  FOCUS_RING,
                )}
                aria-label="Abrir menú del panel"
              >
                <Menu size={20} />
              </button>
              {/* El logo lleva al inicio del panel, no al sitio público: salir del
                  panel por accidente a mitad de una tarea era el efecto de antes. */}
              <Link href="/dashboard" aria-label="Inicio del panel" className={cn("rounded", FOCUS_RING)}>
                <Image src="/logo-mark.png" alt="SKYCODE" width={120} height={70} className="h-8 w-auto" />
              </Link>
              <div className="hidden h-4 w-px bg-foreground/20 sm:block" />
              <span className="hidden rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent-strong sm:inline-block">
                SKYCODE Command Center
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Buscar (Ctrl K)"
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full border border-foreground/15 px-3.5 text-xs text-foreground/70 transition-colors hover:bg-foreground/5 sm:min-w-44",
                  FOCUS_RING,
                )}
              >
                <Search size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Buscar…</span>
                <kbd className="ml-auto hidden rounded border border-foreground/15 px-1.5 font-mono text-[11px] text-foreground/70 md:inline">⌘K</kbd>
              </button>
              {/* La identidad del header lleva a "Mi Cuenta" — el patrón que
                  cualquiera espera de un panel (clic en tu nombre/foto = tu
                  perfil), en vez de un texto inerte. */}
              <Link
                href="/dashboard/cuenta"
                aria-label={`Mi cuenta: ${user.name}, ${roleLabel(user.role)}`}
                className={cn(
                  "hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-xs transition-colors hover:bg-foreground/5 md:flex",
                  FOCUS_RING,
                )}
              >
                <UserAvatar name={user.name} src={user.avatarUrl} size="sm" decorative />
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold text-foreground">{user.name}</span>
                  <span className="text-[11px] text-foreground/70">{roleLabel(user.role)}</span>
                </span>
              </Link>
              <NotificationBell />
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-lg border border-foreground/15 px-3 text-xs text-foreground/80 transition-colors hover:bg-foreground/10",
                  FOCUS_RING,
                )}
              >
                <LogOut size={14} aria-hidden="true" />
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

          <main inert={drawerOpen} className="min-w-0 flex-1 space-y-8 px-4 py-8 pb-28 sm:px-6 lg:pb-8">
            {children}
          </main>
        </div>

        <BottomNav role={user.role} pathname={pathname} onMore={() => setDrawerOpen(true)} inert={drawerOpen} />
        {drawerOpen && <MobileDrawer role={user.role} pathname={pathname} onClose={closeDrawer} />}
        <CommandPalette role={user.role} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </FeedbackProvider>
  );
}
