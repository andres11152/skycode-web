import { cache } from "react";
import { getBlogPosts } from "@/content/blog";
import type { BlogPost } from "@/content/blogShared";
import { getPublishedTeamProfile } from "@/lib/queries/teamProfiles";
import type { Locale } from "@/lib/i18n";

// Datos de la página de cada persona (`/equipo/{slug}`), server-only (llega a `lib/db.ts`).
// `cache()` de React: `generateMetadata` y la página piden el mismo perfil en una misma renderización y
// deben leer el MISMO resultado (mismo motivo que `getPostBySlug`).

export const getAuthorProfile = cache((slug: string, locale: Locale) => getPublishedTeamProfile(slug, locale));

/** Artículos publicados de una persona en un idioma, el más reciente primero. */
export async function getAuthorPosts(slug: string, locale: Locale): Promise<BlogPost[]> {
  const posts = await getBlogPosts(locale);
  return posts.filter((post) => post.authorSlug === slug);
}
