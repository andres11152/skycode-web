"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { SessionUser } from "@/components/dashboard/types";

export function PortalChrome({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10 bg-foreground/5 backdrop-blur-2xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Image src="/logo-mark.png" alt="SKYCODE Logo" width={120} height={70} className="h-8 w-auto" />
            </Link>
            <div className="h-4 w-px bg-foreground/20" />
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-mono font-bold text-accent-strong">
              Portal de Cliente
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-foreground/80 font-mono">{user.name}</span>
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

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">{children}</main>
    </div>
  );
}
