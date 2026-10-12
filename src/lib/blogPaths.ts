import { siteUrl } from "@/lib/site";
import { teamMemberPath } from "@/lib/teamPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";

// Funciones puras de construcción de rutas — sin ningún import de
// content/blog.ts ni de lib/db.ts a propósito. Un componente cliente
// (Footer, PostCard, BlogTeaser, ArticleView) necesita construir la URL de
// un post sin arrastrar `pg` a su bundle del navegador — eso pasaba antes
// de separar este archivo de lib/blogMetadata.ts: cualquier cosa que
// importara `blogIndexPath` desde ahí se traía transitivamente
// content/blog.ts -> lib/queries/articles.ts -> lib/db.ts -> `pg`, y el
// build fallaba con "Module not found: util/types" al intentar bundlear
// `pg` para el navegador. `lib/blogMetadata.ts` (server-only, con las
// funciones que sí leen de la base) importa estas mismas funciones de acá.

/** Ruta absoluta del índice del blog para un locale — mismo segmento "blog" en los tres idiomas, solo cambia el prefijo. */
export function blogIndexPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/blog`;
}

/** Ruta absoluta de un post para un locale dado. */
export function blogPostPath(locale: Locale, slug: string): string {
  return `${blogIndexPath(locale)}/${slug}`;
}

/** URL absoluta de la página del autor (`/equipo/{slug}`): la `url` de su entidad `Person` en el JSON-LD. */
export function authorUrl(locale: Locale, authorSlug: string): string {
  return `${siteUrl}${teamMemberPath(locale, authorSlug)}`;
}

/** Página del autor, ruta relativa y con prefijo de idioma — para enlaces dentro del sitio (`authorUrl` es la absoluta del JSON-LD). */
export function authorPath(locale: Locale, authorSlug: string): string {
  return teamMemberPath(locale, authorSlug);
}
