"use client";

import { useLocale } from "@/components/LocaleProvider";
import { getNavContent } from "@/content/nav";

export function SkipLink() {
  const locale = useLocale();
  const navData = getNavContent(locale);

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
    >
      {navData.skipLink}
    </a>
  );
}
