"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { locales, localeHomePath, localeNames, type Locale } from "@/lib/i18n";

const LOCALE_CODE: Record<Locale, string> = { es: "ES", en: "EN", fr: "FR" };
const LOCALE_FLAG: Record<Locale, string> = { es: "🇨🇴", en: "🇺🇸", fr: "🇫🇷" };

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
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-base">{LOCALE_FLAG[locale]}</span>
        <span>{LOCALE_CODE[locale]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn("absolute right-0 top-12 z-50 min-w-[150px] overflow-hidden rounded-xl p-1 shadow-2xl backdrop-blur-2xl", glassClassName)}
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
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    loc === locale
                      ? "bg-accent/15 text-accent"
                      : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  <span className="text-base">{LOCALE_FLAG[loc]}</span>
                  <span>{localeNames[loc]}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
