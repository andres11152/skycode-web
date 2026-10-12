// Slugs de URL por idioma — la tabla única de las rutas "nativas" de servicios y blog.
//
// El español conserva sus slugs (son los históricos y ya están indexados). Inglés y francés tenían
// los MISMOS slugs en español (`/en/servicios/migracion-datos-legacy`, `/en/blog/migracion-…`), que
// no coinciden con lo que busca quien escribe en ese idioma. Desde la fase 3 del programa de SEO:
//
//   /servicios/migracion-datos-legacy            (es, sin cambios)
//   /en/services/legacy-software-migration       (antes /en/servicios/migracion-datos-legacy)
//   /fr/services/migration-systemes-legacy       (antes /fr/servicios/migracion-datos-legacy)
//   /en/blog/legacy-system-migration-without-downtime   (antes /en/blog/migracion-sistemas-legados-…)
//
// Dos identificadores internos NO cambian y son la clave de todo lo demás (contenido, enlazado,
// casos, hreflang): el `id` de un servicio (su slug en español) y la `clave de traducción` de un
// post (su slug en español). Este archivo no tiene imports: lo usan el servidor, componentes cliente
// (Footer, Navbar), el proxy (Edge), los tests y los scripts de datos.
//
// Para añadir un post con slug distinto por idioma: una entrada en BLOG_POST_SLUGS (si no la tiene,
// su slug es el mismo en los tres idiomas, como siempre).

export type SlugLocale = "es" | "en" | "fr";

export const SLUG_LOCALES: readonly SlugLocale[] = ["es", "en", "fr"];

/** Segmento del índice de servicios por idioma (`/servicios`, `/en/services`, `/fr/services`). */
export const SERVICES_SEGMENT: Record<SlugLocale, string> = { es: "servicios", en: "services", fr: "services" };

/** Segmento del blog (igual en los tres idiomas). */
export const BLOG_SEGMENT = "blog";

export const SERVICE_SLUGS = {
  "desarrollo-software-medida": {
    es: "desarrollo-software-medida",
    en: "custom-software-development",
    fr: "developpement-logiciel-sur-mesure",
  },
  "desarrollo-aplicaciones-moviles": {
    es: "desarrollo-aplicaciones-moviles",
    en: "mobile-app-development",
    fr: "developpement-applications-mobiles",
  },
  "apis-integraciones": {
    es: "apis-integraciones",
    en: "api-development-system-integration",
    fr: "integration-systemes-developpement-api",
  },
  "frontend-alto-rendimiento": {
    es: "frontend-alto-rendimiento",
    en: "nextjs-react-web-development",
    fr: "developpement-web-nextjs-react",
  },
  "ecommerce-tienda-online": {
    es: "ecommerce-tienda-online",
    en: "ecommerce-development",
    fr: "developpement-boutique-en-ligne",
  },
  "seguridad-cumplimiento": {
    es: "seguridad-cumplimiento",
    en: "software-security-compliance",
    fr: "securite-logicielle-conformite",
  },
  "arquitectura-documentacion": {
    es: "arquitectura-documentacion",
    en: "software-architecture-documentation",
    fr: "architecture-documentation-technique",
  },
  "migracion-datos-legacy": {
    es: "migracion-datos-legacy",
    en: "legacy-software-migration",
    fr: "migration-systemes-legacy",
  },
  "inteligencia-artificial-aplicada": {
    es: "inteligencia-artificial-aplicada",
    en: "applied-ai-automation",
    fr: "ia-appliquee-automatisation",
  },
} as const satisfies Record<string, Record<SlugLocale, string>>;

export type ServiceId = keyof typeof SERVICE_SLUGS;

export const SERVICE_IDS = Object.keys(SERVICE_SLUGS) as ServiceId[];

export function isServiceId(value: string): value is ServiceId {
  return Object.hasOwn(SERVICE_SLUGS, value);
}

/** Slug público de un servicio en un idioma. */
export function serviceSlugFor(id: ServiceId, locale: SlugLocale): string {
  return SERVICE_SLUGS[id][locale];
}

/** `id` interno del servicio al que pertenece un slug público de ese idioma, o `undefined` si no existe. */
export function serviceIdFromSlug(slug: string, locale: SlugLocale): ServiceId | undefined {
  return SERVICE_IDS.find((id) => SERVICE_SLUGS[id][locale] === slug);
}

/**
 * Posts con slug distinto por idioma. La clave es la CLAVE DE TRADUCCIÓN (el slug en español, el
 * identificador estable del post en los tres idiomas). El español no se lista: conserva su slug.
 */
export const BLOG_POST_SLUGS: Record<string, { en: string; fr: string }> = {
  "ley-1581-guia-tecnica-software": {
    en: "colombia-law-1581-software-compliance-guide",
    fr: "loi-1581-colombie-conformite-logicielle",
  },
  "deuda-tecnica-como-detectarla": {
    en: "how-to-detect-technical-debt",
    fr: "detecter-dette-technique",
  },
  "buenas-practicas-apis-rest": {
    en: "rest-api-architecture-best-practices",
    fr: "architecture-api-rest-bonnes-pratiques",
  },
  "outsourcing-software-latam-propiedad-codigo": {
    en: "software-outsourcing-latin-america-code-ownership",
    fr: "externalisation-logicielle-amerique-latine-propriete-code",
  },
  "migracion-sistemas-legados-sin-interrupcion": {
    en: "legacy-system-migration-without-downtime",
    fr: "migration-systeme-legacy-sans-interruption",
  },
  "optimizacion-costos-nube-serverless-colombia": {
    en: "cloud-cost-optimization-serverless-colombia",
    fr: "optimisation-couts-cloud-serverless-colombie",
  },
};

/** Slug público de un post en un idioma, dada su clave de traducción. Sin entrada propia, la clave misma. */
export function publicPostSlug(key: string, locale: SlugLocale): string {
  if (locale === "es") return key;
  return Object.hasOwn(BLOG_POST_SLUGS, key) ? BLOG_POST_SLUGS[key][locale] : key;
}

/**
 * Clave de traducción de un slug cualquiera de ese idioma: acepta el slug público nuevo, el histórico
 * (que en inglés/francés era la clave en español) o uno desconocido (su propia clave).
 */
export function postKeyFromSlug(slug: string, locale: SlugLocale): string {
  if (locale === "es") return slug;
  const entry = Object.entries(BLOG_POST_SLUGS).find(([, slugs]) => slugs[locale] === slug);
  return entry ? entry[0] : slug;
}

/** Todos los slugs con los que una fila de la base puede estar guardada (nuevo o histórico), para buscarla sin importar si ya se renombró. */
export function postSlugCandidates(slug: string, locale: SlugLocale): string[] {
  const key = postKeyFromSlug(slug, locale);
  return [...new Set([slug, key, publicPostSlug(key, locale)])];
}

// ── Rutas históricas → nuevas ───────────────────────────────────────────────────────────────────

const LOCALE_PREFIX: Record<SlugLocale, string> = { es: "", en: "/en", fr: "/fr" };

export interface LegacySlugRedirect {
  from: string;
  to: string;
}

/** Cada ruta histórica de servicios y blog en inglés/francés con su destino nuevo (301). */
export function listLocalizedSlugRedirects(): LegacySlugRedirect[] {
  const redirects: LegacySlugRedirect[] = [];
  for (const locale of ["en", "fr"] as const) {
    const prefix = LOCALE_PREFIX[locale];
    redirects.push({ from: `${prefix}/servicios`, to: `${prefix}/${SERVICES_SEGMENT[locale]}` });
    for (const id of SERVICE_IDS) {
      redirects.push({ from: `${prefix}/servicios/${id}`, to: `${prefix}/${SERVICES_SEGMENT[locale]}/${SERVICE_SLUGS[id][locale]}` });
    }
    for (const key of Object.keys(BLOG_POST_SLUGS)) {
      redirects.push({ from: `${prefix}/${BLOG_SEGMENT}/${key}`, to: `${prefix}/${BLOG_SEGMENT}/${BLOG_POST_SLUGS[key][locale]}` });
    }
  }
  return redirects;
}

const LEGACY_SLUG_REDIRECTS = new Map(listLocalizedSlugRedirects().map((r) => [r.from, r.to]));

/** Destino nuevo de una ruta histórica de servicios/blog (sin barra final ni consulta), o `null` si no lo es. */
export function resolveLocalizedSlugRedirect(path: string): string | null {
  return LEGACY_SLUG_REDIRECTS.get(path) ?? null;
}

/**
 * Reescribe una ruta interna con la forma histórica a la nueva (conservando `?consulta` y `#ancla`);
 * cualquier otra ruta se devuelve igual. Lo usa el renderizado de enlaces `[texto](/ruta)` (para que
 * el contenido guardado antes del cambio apunte ya al destino final, sin pasar por un 301) y el
 * script de datos que reescribe los enlaces en Postgres.
 */
export function localizeLegacyPath(href: string): string {
  const match = /^([^?#]*)(.*)$/.exec(href);
  if (!match) return href;
  const [, path, rest] = match;
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const target = LEGACY_SLUG_REDIRECTS.get(clean);
  return target ? `${target}${rest}` : href;
}

// ── Enlaces internos de un contenido en un idioma ───────────────────────────────────────────────

/** Raíces del sitio en español → su equivalente por idioma (las que tienen versión traducida). */
const ES_ROOT_TO_LOCALE: Record<string, { en: string; fr: string }> = {
  portafolio: { en: "portfolio", fr: "portfolio" },
  "preguntas-frecuentes": { en: "faq", fr: "faq" },
  equipo: { en: "equipo", fr: "equipo" },
  cotizador: { en: "cotizador", fr: "cotizador" },
};

/**
 * Lleva un enlace interno `href` de un contenido escrito en `locale` a su forma final:
 *   1. rutas históricas de servicios/blog → slugs nativos (`localizeLegacyPath`);
 *   2. en inglés/francés, un enlace que quedó SIN prefijo de idioma (apunta a la página en español,
 *      p. ej. `/portafolio` dentro de un post en inglés) → la misma página en ese idioma.
 * Lo que no reconoce (rutas externas, legales, anclas de otras páginas) se devuelve igual.
 */
export function localizeInternalHref(href: string, locale: SlugLocale): string {
  const upgraded = localizeLegacyPath(href);
  if (locale === "es" || !upgraded.startsWith("/") || upgraded.startsWith("//")) return upgraded;
  if (/^\/(?:en|fr)(?:[/?#]|$)/.test(upgraded)) return upgraded;

  const match = /^([^?#]*)(.*)$/.exec(upgraded);
  if (!match) return upgraded;
  const [, rawPath, rest] = match;
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  const prefix = LOCALE_PREFIX[locale];

  if (path === "/") return `${prefix}/${rest}`.replace(/\/$/, rest ? "/" : "");
  const [root, ...tail] = path.split("/").filter(Boolean);

  if (root === "servicios") {
    if (tail.length === 0) return `${prefix}/${SERVICES_SEGMENT[locale]}${rest}`;
    return isServiceId(tail[0]) ? `${prefix}/${SERVICES_SEGMENT[locale]}/${SERVICE_SLUGS[tail[0]][locale]}${rest}` : upgraded;
  }
  if (root === BLOG_SEGMENT) {
    if (tail.length === 0) return `${prefix}/${BLOG_SEGMENT}${rest}`;
    return `${prefix}/${BLOG_SEGMENT}/${publicPostSlug(postKeyFromSlug(tail[0], "es"), locale)}${rest}`;
  }
  const mapped = Object.hasOwn(ES_ROOT_TO_LOCALE, root) ? ES_ROOT_TO_LOCALE[root][locale] : null;
  if (mapped) return `${prefix}/${[mapped, ...tail].join("/")}${rest}`;
  return upgraded;
}
