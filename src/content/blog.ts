import { getPublishedArticleBySlug, getPublishedArticles } from "@/lib/queries/articles";
import type { Locale } from "@/lib/i18n";

// Server-only a propósito: re-exporta los tipos/funciones puras de
// content/blogShared.ts (nunca los redefine) y agrega `getBlogPosts`/
// `getPostBySlug`, que leen de Postgres desde la Fase 3 del plan de SEO —
// aprobar un borrador en /dashboard/contenido lo publica sin necesitar un
// deploy, porque el sitio público lee esta tabla en cada request en vez de
// un JSON empaquetado en build time.
//
// Un componente cliente NUNCA debe importar de este archivo — solo de
// content/blogShared.ts (ver la nota completa ahí; ya pasó un build roto
// por esto, arrastrando `pg` al bundle del navegador).
export type { BlogBlock, BlogPost, BlogMeta } from "@/content/blogShared";
export { getBlogMeta, readingTime } from "@/content/blogShared";

/** Posts publicados de un locale, más reciente primero — lee de Postgres en cada llamada. */
export async function getBlogPosts(locale: Locale) {
  return getPublishedArticles(locale);
}

export async function getPostBySlug(slug: string, locale: Locale) {
  return getPublishedArticleBySlug(slug, locale);
}
