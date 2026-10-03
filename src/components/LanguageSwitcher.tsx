"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { CheckIcon } from "@/components/icons/UiIcons";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { locales, localeHomePath, localeNames, type Locale } from "@/lib/i18n";

const LOCALE_CODE: Record<Locale, string> = { es: "ES", en: "EN", fr: "FR" };
const LOCALE_FLAG: Record<Locale, string> = { es: "🇨🇴", en: "🇺🇸", fr: "🇫🇷" };

export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Origen arriba-derecha: el menú "nace" del botón. Con reduced motion solo fundido.
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 };

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
          initial={hidden}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={hidden}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          className="absolute right-0 top-12 z-50 min-w-[165px] origin-top-right overflow-hidden rounded-xl border border-foreground/15 bg-background/95 p-1.5 shadow-2xl backdrop-blur-2xl shadow-black/20"
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
                  "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                  loc === locale
                    ? "bg-accent/15 text-accent-strong font-bold"
                    : "text-foreground/90 hover:bg-foreground/10 hover:text-foreground",
                )}
              >
                <span className="text-base">{LOCALE_FLAG[loc]}</span>
                <span>{localeNames[loc]}</span>
                {loc === locale && <CheckIcon size={14} className="ml-auto" />}
              </Link>
            </li>
          ))}
        </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
