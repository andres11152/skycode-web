"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { CheckIcon, ChevronDownIcon, GlobeIcon } from "@/components/icons/UiIcons";
import { DURATION, EASE_OUT } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { switchLocalePath } from "@/lib/localePaths";
import { locales, localeNames, type Locale } from "@/lib/i18n";

const LOCALE_CODE: Record<Locale, string> = { es: "ES", en: "EN", fr: "FR" };

export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Conserva la página al cambiar de idioma (portafolio, FAQ, servicios…); ver lib/localePaths.ts.
  const pathname = usePathname();
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
        className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <GlobeIcon
          size={15}
          className="text-foreground/60 transition-colors group-hover:text-foreground"
        />
        <span className="font-mono text-xs font-bold tracking-wider">{LOCALE_CODE[locale]}</span>
        <ChevronDownIcon
          size={11}
          className={cn(
            "text-foreground/40 transition-transform duration-200 ease-out group-hover:text-foreground/70",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            aria-orientation="vertical"
            initial={hidden}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={hidden}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="absolute right-0 top-12 z-50 min-w-[170px] origin-top-right overflow-hidden rounded-xl border border-foreground/15 bg-background/95 p-1.5 shadow-2xl backdrop-blur-2xl shadow-black/20"
          >
            {locales.map((loc) => {
              const isCurrent = loc === locale;
              return (
                <li key={loc} role="none">
                  <Link
                    role="menuitem"
                    href={switchLocalePath(pathname, loc)}
                    onClick={() => {
                      setOpen(false);
                    }}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "group flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                      isCurrent
                        ? "bg-accent/10 text-accent-strong font-semibold"
                        : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors",
                        isCurrent
                          ? "bg-accent/20 text-accent-strong"
                          : "bg-foreground/5 text-foreground/50 group-hover:bg-foreground/10 group-hover:text-foreground/80",
                      )}
                    >
                      {LOCALE_CODE[loc]}
                    </span>
                    <span className="font-medium">{localeNames[loc]}</span>
                    {isCurrent && <CheckIcon size={14} className="ml-auto text-accent-strong" />}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
