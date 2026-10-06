"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/dashboard/ui/Button";
import { FeedbackProvider } from "@/components/dashboard/ui/Feedback";
import { TableEnhancer } from "@/components/dashboard/ui/TableEnhancer";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/components/dashboard/types";

// Hasta acá el portal era una sola ruta y el header no tenía navegación.
// Con `/portal/cuenta` hay dos destinos reales — se listan explícitos en
// vez de un menú desplegable porque son solo dos y caben siempre.
const PORTAL_NAV = [
  { href: "/portal", label: "Proyectos", isActive: (path: string) => path === "/portal" },
  { href: "/portal/cuenta", label: "Mi cuenta", isActive: (path: string) => path.startsWith("/portal/cuenta") },
] as const;

export function PortalChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <FeedbackProvider>
    <TableEnhancer />
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="hidden h-4 w-px bg-foreground/20 sm:block" />
            <span className="hidden rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent-strong sm:inline-block">
              Portal de Cliente
            </span>
          </div>

          <nav aria-label="Navegación del portal" className="flex items-center gap-1">
            {PORTAL_NAV.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active ? "bg-foreground/[0.06] text-foreground" : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <UserAvatar name={user.name} src={user.avatarUrl} size="sm" decorative />
              <span className="max-w-40 truncate text-xs font-semibold text-foreground/80">{user.name}</span>
            </div>
            <Button variant="secondary" onClick={handleLogout} aria-label="Cerrar sesión">
              <SignOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6">{children}</main>
    </div>
    </FeedbackProvider>
  );
}
