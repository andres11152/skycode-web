import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { faqPath } from "@/lib/faqPaths";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { servicePath, servicesIndexPath } from "@/lib/servicePaths";
import { isLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { BLOG_POST_SLUGS, isServiceId, postKeyFromSlug, publicPostSlug, serviceIdFromSlug } from "@/seo/slugs";

// Función pura (sin React ni DB) — la usa el selector de idioma, un componente
// cliente. Antes el selector llevaba siempre a la HOME del otro idioma porque
// solo la home y poco más tenían versión por idioma; ahora casi todo la tiene,
// así que conserva la página donde estás cuando existe su equivalente.

/** Segmentos de ruta (sin prefijo de idioma) que existen con el mismo nombre en los tres idiomas. */
const SAME_SEGMENT_ROOTS = new Set(["equipo", "cotizador"]);

/**
 * Ruta equivalente de `pathname` en el idioma `target`. Si la página no tiene
 * versión en ese idioma (ej. los documentos legales, solo en español) o no se
 * puede garantizar que exista (un artículo del blog puede no estar traducido),
 * cae a la mejor página cercana: el índice de la sección o la home.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const segments = clean.split("/").filter(Boolean);

  // Quita el prefijo de idioma actual (/en, /fr); el español no lleva prefijo.
  let source: Locale = "es";
  if (segments[0] && isLocale(segments[0]) && segments[0] !== "es") source = segments.shift() as Locale;
  if (segments.length === 0) return localeHomePath(target);

  const [root, ...rest] = segments;
  const prefix = localeHomePath(target) === "/" ? "" : localeHomePath(target);

  // FAQ: el slug se traduce (`preguntas-frecuentes` / `faq`).
  if (root === "preguntas-frecuentes" || root === "faq") return faqPath(target);

  // Portafolio: el slug del índice se traduce (`portafolio` / `portfolio`); el del caso es común.
  if (root === "portafolio" || root === "portfolio") {
    return rest[0] ? portfolioCasePath(target, rest[0]) : portfolioIndexPath(target);
  }

  // Servicios: el segmento del índice y el slug de cada servicio se traducen (`/servicios/…`,
  // `/en/services/…`). También se entienden las rutas históricas (`/en/servicios/<id>`).
  if (root === "servicios" || root === "services") {
    if (!rest[0]) return servicesIndexPath(target);
    const id = serviceIdFromSlug(rest[0], source) ?? (isServiceId(rest[0]) ? rest[0] : undefined);
    return id ? servicePath(target, id) : servicesIndexPath(target);
  }

  // Blog: el índice existe siempre. Un artículo con equivalente conocido (los que tienen slug por
  // idioma) lleva a su versión; uno desconocido puede no estar traducido → el índice.
  if (root === "blog") {
    const key = rest[0] ? postKeyFromSlug(rest[0], source) : null;
    return key && Object.hasOwn(BLOG_POST_SLUGS, key) ? blogPostPath(target, publicPostSlug(key, target)) : blogIndexPath(target);
  }

  if (SAME_SEGMENT_ROOTS.has(root)) return `${prefix}/${[root, ...rest].join("/")}`;

  // Legales, gracias, rutas internas… sin versión por idioma: home del idioma elegido.
  return localeHomePath(target);
}
