import blogMetaEs from "./locales/es/blog.json";
import blogMetaEn from "./locales/en/blog.json";
import blogMetaFr from "./locales/fr/blog.json";
import type { Locale } from "@/lib/i18n";
import { stripInlineLinks } from "@/lib/inlineLinks";

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
  | { type: "code"; language: string; code: string }
  // Preguntas frecuentes: se renderizan como h3 + respuesta (va siempre
  // después de un `heading` de nivel 2 que las presente) y alimentan el
  // JSON-LD `FAQPage` de ArticleJsonLd. El texto de `paragraph`/`list`/`answer`
  // admite enlaces internos `[texto](/ruta)`, ver lib/inlineLinks.ts.
  | { type: "faq"; items: { question: string; answer: string }[] };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  /** Fecha de última revisión editorial — separada de `publishedAt`, ver la nota en `approveAndPublish` de lib/queries/articles.ts. */
  updatedAt: string;
  author: string;
  /** Slug del perfil público en `team_profiles` (ver lib/queries/teamProfiles.ts) — enlaza el JSON-LD `author` a `/equipo#slug`. */
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
  copyCode: string;
  copiedCode: string;
  featuredLabel: string;
  featuredCta: string;
  moreHeading: string;
  rssTitle: string;
  rssDescription: string;
  rssCta: string;
  rssCopy: string;
  rssCopied: string;
  rssModalTitle: string;
  rssModalDescription: string;
  rssOpenFeedly: string;
  rssOpenInoreader: string;
  rssViewFeed: string;
  rssClose: string;
  /** Con `{date}`: "Actualizado el 3 de mayo de 2026". */
  updatedOn: string;
  authorLabel: string;
  authorProfile: string;
  serviceLabel: string;
  serviceCta: string;
  relatedHeading: string;
  prevLabel: string;
  nextLabel: string;
  ctaDescription: string;
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

/** Texto visible de un bloque (sin sintaxis de enlace) — compartido por el conteo de palabras y el RSS. */
export function blockPlainText(block: BlogBlock): string {
  if (block.type === "paragraph" || block.type === "heading") return stripInlineLinks(block.text);
  if (block.type === "list") return block.items.map(stripInlineLinks).join(" — ");
  if (block.type === "faq") return block.items.map((item) => `${item.question} ${stripInlineLinks(item.answer)}`).join(" ");
  return "";
}

function wordCount(blocks: BlogBlock[]): number {
  return blocks.reduce((total, block) => {
    const text = blockPlainText(block).trim();
    return text ? total + text.split(/\s+/).length : total;
  }, 0);
}

export function readingTime(post: BlogPost): number {
  return Math.max(1, Math.round(wordCount(post.content) / 200));
}
