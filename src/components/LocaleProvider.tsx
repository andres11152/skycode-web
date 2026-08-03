"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(defaultLocale);

/**
 * Deriva el locale actual del primer segmento de la ruta (`/en/...`, `/fr/...`,
 * default `es` si no hay prefijo). Rutas fuera del árbol [locale] (blog, legal)
 * caen siempre en `es` porque ese contenido todavía no está traducido.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const locale = isLocale(segment) ? segment : defaultLocale;

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
