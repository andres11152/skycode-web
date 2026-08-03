"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { localeHtmlLang } from "@/lib/i18n";

/**
 * El layout raíz es único para todo el sitio (no hay un <html> por locale),
 * así que sincronizamos el atributo lang en cliente según la ruta actual.
 * SEO no depende de esto — usa `alternates.languages` (hreflang) por página.
 */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[locale];
  }, [locale]);

  return null;
}
