"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { ENABLE_DARK_MODE, THEME_STORAGE_KEY, isLightOnlyPath } from "@/lib/theme";

/**
 * Mantiene `<html data-theme>` coherente en las navegaciones del lado cliente.
 *
 * El script del <head> (lib/theme.ts) solo corre en la carga completa de la página. Con
 * el router de Next, ir de la home (oscura) a /login o /dashboard no recarga nada, así
 * que sin esto esas pantallas —que todavía no tienen paleta oscura— heredarían el tema.
 * `useLayoutEffect` y no `useEffect`: corrige el atributo antes de pintar, sin parpadeo.
 */
export function ThemeSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!ENABLE_DARK_MODE) return;
    const root = document.documentElement;
    if (isLightOnlyPath(pathname)) {
      root.setAttribute("data-theme", "light");
      return;
    }
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Sin acceso al storage (modo privado, datos bloqueados): se queda en "Sistema".
    }
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);
    else root.removeAttribute("data-theme");
  }, [pathname]);

  return null;
}
