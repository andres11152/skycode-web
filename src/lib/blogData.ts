import { getBlogPosts } from "@/content/blog";
import type { BlogPost } from "@/content/blogShared";
import type { PublicTeamMember } from "@/content/teamShared";
import { getPublishedTeamProfiles } from "@/lib/queries/teamProfiles";
import type { Locale } from "@/lib/i18n";

/**
 * Datos de contexto del blog para las vistas (server-only: llega a
 * `lib/db.ts`). Las vistas son Server Components y reciben esto por prop.
 */

/** Perfiles públicos indexados por `author_slug`. Sin Postgres (build en CI) devuelve `{}`: el autor se ve como texto. */
export async function getBlogAuthors(locale: Locale): Promise<Record<string, PublicTeamMember>> {
  const members = await getPublishedTeamProfiles(locale);
  return Object.fromEntries(members.map((member) => [member.slug, member]));
}

export interface ArticleContext {
  author: PublicTeamMember | null;
  related: BlogPost[];
  /** El artículo publicado justo antes (más antiguo). */
  previous: BlogPost | null;
  /** El publicado justo después (más reciente). */
  next: BlogPost | null;
}

const RELATED_COUNT = 3;

/** Relacionados por etiquetas compartidas (y recencia como desempate), sin repetir los vecinos cronológicos mientras haya de dónde elegir. */
export async function getArticleContext(post: BlogPost, locale: Locale): Promise<ArticleContext> {
  const [posts, authors] = await Promise.all([getBlogPosts(locale), getBlogAuthors(locale)]);
  const index = posts.findIndex((candidate) => candidate.slug === post.slug);
  const next = index > 0 ? posts[index - 1] : null;
  const previous = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

  const tags = new Set(post.tags);
  const ranked = posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({ candidate, score: candidate.tags.filter((tag) => tags.has(tag)).length }))
    // `posts` ya viene más reciente primero y `sort` es estable: el empate conserva ese orden.
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);

  const neighbours = new Set([previous?.slug, next?.slug]);
  const preferred = ranked.filter((candidate) => !neighbours.has(candidate.slug));
  const fallback = ranked.filter((candidate) => neighbours.has(candidate.slug));

  return {
    author: authors[post.authorSlug] ?? null,
    related: [...preferred, ...fallback].slice(0, RELATED_COUNT),
    previous,
    next,
  };
}
