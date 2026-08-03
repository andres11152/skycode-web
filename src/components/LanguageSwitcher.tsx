"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { locales, localeHomePath, localeNames, type Locale } from "@/lib/i18n";

const LOCALE_CODE: Record<Locale, string> = { es: "ES", en: "EN", fr: "FR" };

export function LanguageSwitcher({
  locale,
  glassClassName,
  className,
}: {
  locale: Locale;
  glassClassName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${localeNames[locale]} — cambiar idioma / change language / changer de langue`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Globe size={15} aria-hidden="true" />
        {LOCALE_CODE[locale]}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn("absolute left-0 sm:left-auto sm:right-0 top-12 z-10 min-w-[150px] overflow-hidden rounded-xl p-1", glassClassName)}
          >
            {locales.map((loc) => (
              <li key={loc}>
                <Link
                  href={localeHomePath(loc)}
                  onClick={() => {
                    setOpen(false);
                    try {
                      localStorage.setItem("skycode-locale", loc);
                    } catch {}
                  }}
                  aria-current={loc === locale ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent",
                    loc === locale ? "font-semibold text-accent-strong" : "text-foreground/80",
                  )}
                >
                  {localeNames[loc]}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
