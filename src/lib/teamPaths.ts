import { siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";

// Rutas del equipo: funciones PURAS (sin Next, DB ni contenido) para usarlas en componentes cliente
// (Footer, TeamView), en el blog y en el JSON-LD. `teamMetadata.ts` re-exporta `teamPath`.
//
// `/equipo` (la lista) y `/equipo/{slug}` (la página de cada autor, E-E-A-T): el slug de la persona es
// el mismo en los tres idiomas (`/equipo/cesar-leon`, `/en/equipo/cesar-leon`, `/fr/equipo/cesar-leon`),
// igual que el segmento `equipo`. Cada post del blog enlaza a la página de su autor.

const prefixOf = (locale: Locale): string => {
  const homePath = localeHomePath(locale);
  return homePath === "/" ? "" : homePath;
};

/** Ruta del índice del equipo. */
export function teamPath(locale: Locale): string {
  return `${prefixOf(locale)}/equipo`;
}

/** Ruta de la página de una persona del equipo. */
export function teamMemberPath(locale: Locale, slug: string): string {
  return `${teamPath(locale)}/${slug}`;
}

/**
 * `@id` de la entidad `Person` de una persona. UNA sola por persona en los tres idiomas (la de la
 * página en español), para que el autor de un post en inglés, la página de equipo y la del autor
 * hablen de la misma entidad; la `url` de cada nodo sí es la de su idioma.
 */
export function personId(slug: string): string {
  return `${siteUrl}${teamMemberPath("es", slug)}#person`;
}
