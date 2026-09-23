import blogMetaEs from "./locales/es/blog.json";
import blogMetaEn from "./locales/en/blog.json";
import blogMetaFr from "./locales/fr/blog.json";
import type { Locale } from "@/lib/i18n";

// Tipos + funciones puras del blog (sin ningún import de lib/db.ts ni de
// lib/queries/articles.ts) — separado de content/blog.ts a propósito. Un
// componente cliente (ArticleView, PostCard, BlogIndexView, BlogTeaser,
// ArticleEditor) necesita el tipo `BlogPost`, `getBlogMeta()` o
// `readingTime()` sin arrastrar `pg` a su bundle del navegador — eso
// pasaba antes de separar este archivo: cualquier cosa que importara
// `readingTime` desde content/blog.ts se traía transitivamente
// lib/queries/articles.ts -> lib/db.ts -> `pg`, y el build fallaba
// bundleando módulos nativos de Node ("tls", "util/types") para el
// navegador (mismo bug real que motivó separar lib/blogPaths.ts de
// lib/blogMetadata.ts). content/blog.ts (server-only) importa estos mismos
// tipos/funciones de acá y agrega `getBlogPosts`/`getPostBySlug`.

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  /** Fecha de última revisión editorial — separada de `publishedAt`, ver la nota en `approveAndPublish` de lib/queries/articles.ts. */
  updatedAt: string;
  author: string;
  /** Slug del miembro del equipo en `content/team.ts` — enlaza el JSON-LD `author` a `/equipo#slug`. */
  authorSlug: string;
  tags: string[];
  content: BlogBlock[];
}

export interface BlogMeta {
  indexTitle: string;
  indexDescription: string;
  badge: string;
  heading: string;
  intro: string;
  readingTimeSuffix: string;
  breadcrumbAria: string;
  breadcrumbHome: string;
  breadcrumbBlog: string;
  backToBlog: string;
  tocHeading: string;
  ctaQuestion: string;
  ctaButton: string;
}

const blogMetaByLocale: Record<Locale, BlogMeta> = {
  es: blogMetaEs.meta,
  en: blogMetaEn.meta,
  fr: blogMetaFr.meta,
};

/** Metadata de la sección (título/descripción del índice, textos de UI) para un locale dado — síncrona, viene del JSON de UI, no de la base. */
export function getBlogMeta(locale: Locale): BlogMeta {
  return blogMetaByLocale[locale];
}

function wordCount(blocks: BlogBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === "paragraph" || block.type === "heading") {
      return total + block.text.split(/\s+/).length;
    }
    if (block.type === "list") {
      return total + block.items.join(" ").split(/\s+/).length;
    }
    return total;
  }, 0);
}

export function readingTime(post: BlogPost): number {
  return Math.max(1, Math.round(wordCount(post.content) / 200));
}
