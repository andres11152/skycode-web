import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import type { Locale } from "@/lib/i18n";

// URLs heredadas del sitio anterior (WordPress) y casos retirados del portafolio.
//
// Una sola tabla de reglas, pura y probada (legacyUrls.test.ts), que ejecuta `proxy.ts`. No
// vive en `redirects()` de next.config porque Next antepone SU redirección de barra final
// (`/x/` → `/x`, 308) a las del usuario: `/es/inicio/` daría 308 y luego 301, dos saltos. Con
// `skipTrailingSlashRedirect` + proxy, cada variante (con o sin barra) resuelve en UN salto.
//
// Redirecciones: 301 (permanente, conserva la señal). `/wp-*`, `xmlrpc.php` y los `*/feed`
// de WordPress devuelven 410 (Gone): no tienen equivalente en este sitio y NO se mandan a la
// home (un redirect a la home de algo que no existe es un soft 404). El RSS real es `/feed.xml`.

export type LegacyOutcome = { kind: "redirect"; to: string; status: 301 } | { kind: "gone" };

/** Casos retirados del portafolio (`archived` en la base): su URL conserva autoridad apuntando al índice. */
export const RETIRED_PORTFOLIO_SLUGS = ["moncyre"] as const;

const LOCALES: Locale[] = ["es", "en", "fr"];

const redirect = (to: string): LegacyOutcome => ({ kind: "redirect", to, status: 301 });

const RETIRED_PORTFOLIO_PATHS = new Map<string, string>(
  LOCALES.flatMap((locale) =>
    RETIRED_PORTFOLIO_SLUGS.map((slug) => [portfolioCasePath(locale, slug), portfolioIndexPath(locale)] as const),
  ),
);

const EXACT_REDIRECTS = new Map<string, string>([
  ["/es/inicio", "/"],
  ["/en/home", "/en"],
  ["/politica-de-privacidad", "/politica-privacidad"],
]);

/** Sin la barra final (salvo la raíz) y en minúsculas: WordPress no distinguía mayúsculas. */
function normalize(pathname: string): string {
  const stripped = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (stripped || "/").toLowerCase();
}

/** `/en/...` → "en", `/fr/...` → "fr"; sin prefijo, "es". */
function localeOf(path: string): Locale {
  const prefix = /^\/(en|fr)(?:\/|$)/.exec(path)?.[1];
  return prefix === "en" || prefix === "fr" ? prefix : "es";
}

/**
 * Qué hacer con una URL heredada, o `null` si no lo es (la petición sigue su curso normal).
 * `pathname` puede traer o no la barra final: las dos variantes dan el mismo resultado.
 */
export function resolveLegacyUrl(pathname: string): LegacyOutcome | null {
  const path = normalize(pathname);

  // Infraestructura de WordPress: sin equivalente → 410.
  if (/^\/(wp-content|wp-includes|wp-admin|wp-json)(\/|$)/.test(path) || /^\/wp-[a-z0-9-]+\.php$/.test(path) || path === "/xmlrpc.php") {
    return { kind: "gone" };
  }

  // Feeds de WordPress (`/feed`, `/comments/feed`, `/blog/feed`, `/en/feed`…). El RSS real de este
  // sitio es `/feed.xml` (otro último segmento), que no se toca.
  if (path.split("/").pop() === "feed") return { kind: "gone" };

  const exact = EXACT_REDIRECTS.get(path);
  if (exact) return redirect(exact);

  // Listados antiguos del portafolio (`/portafolio/all`, `/portafolio-cat/web`, `/portfolio-cat/…`):
  // al índice del idioma de la URL; sin prefijo, el español (el idioma sin prefijo del sitio).
  if (/^(?:\/(?:en|fr))?\/(?:portafolio|portfolio)(?:\/all|-cat(?:\/.*)?)$/.test(path)) {
    return redirect(portfolioIndexPath(localeOf(path)));
  }

  const retired = RETIRED_PORTFOLIO_PATHS.get(path);
  if (retired) return redirect(retired);

  return null;
}

/** `/x/` → `/x`; `null` si la ruta ya está normalizada (o es la raíz). */
export function stripTrailingSlash(pathname: string): string | null {
  if (pathname.length <= 1 || !pathname.endsWith("/")) return null;
  return pathname.replace(/\/+$/, "") || "/";
}
