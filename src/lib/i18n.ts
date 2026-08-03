export const locales = ["es", "en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
};

// es usa la región neutral "419" (Latinoamérica y el Caribe, CLDR/Unicode) en vez de
// atarse a un solo país — coherente con la decisión de internacionalizar el copy.
export const localeHtmlLang: Record<Locale, string> = {
  es: "es",
  en: "en-US",
  fr: "fr",
};

export const localeOgLocale: Record<Locale, string> = {
  es: "es_419",
  en: "en_US",
  fr: "fr_FR",
};

/** Ruta absoluta de la home para un locale dado (es = sin prefijo, resto = /{locale}). */
export function localeHomePath(locale: Locale): string {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Sustituye placeholders {clave} en un string de contenido, ej. "Ver {title}" + {title:"X"}. */
export function t(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
