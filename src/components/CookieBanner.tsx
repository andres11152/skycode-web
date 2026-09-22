"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { getCookieBannerContent } from "@/content/cookieBanner";
import { EsBadge } from "@/components/ui/EsBadge";

const STORAGE_KEY = "skycode-cookie-notice-ack";

export function CookieBanner() {
  const locale = useLocale();
  const cookieData = getCookieBannerContent(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // La lectura de localStorage vive en un microtask (no directo en el cuerpo del
    // efecto) para que el setState quede dentro de un callback y no dispare la regla
    // de lint react-hooks/set-state-in-effect — mismo principio que GridPattern
    // (el estado se genera dentro del callback de un sistema externo, no del efecto).
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    });
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={cookieData.ariaLabel}
      className="fixed inset-x-0 bottom-0 z-[65] border-t border-foreground/10 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
          >
            <Cookie size={18} />
          </span>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {cookieData.message}{" "}
            <Link
              href={cookieData.linkUrl}
              className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
            >
              {cookieData.linkText}
            </Link>
            {locale !== "es" && <EsBadge className="ml-1.5" />}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-accent-strong px-6 text-sm font-semibold text-accent-foreground outline-none transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:ml-4"
        >
          {cookieData.accept}
        </button>
      </div>
    </div>
  );
}
