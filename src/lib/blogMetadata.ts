import type { Metadata } from "next";
import { getBlogMeta, getPostBySlug } from "@/content/blog";
import { rssFeedPath } from "@/lib/rss";
import { ogImageUrl, siteUrl } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";

// Server-only: `getPostBySlug`/`getBlogMeta` (vía content/blog.ts) tocan la
// base de datos — este archivo nunca debe importarse desde un componente
// cliente. Los componentes cliente (Footer, PostCard, BlogTeaser,
// ArticleView) importan `blogIndexPath`/`blogPostPath`/`authorUrl` directo
// de lib/blogPaths.ts, que no arrastra `lib/db.ts` — este archivo NO los
// re-exporta a propósito, para que sea imposible importarlos por acá sin
// querer y volver a arrastrar `pg` al bundle del navegador (bug real, ya
// pasó una vez).

export function buildBlogIndexMetadata(locale: Locale): Metadata {
  const meta = getBlogMeta(locale);

  return {
    title: meta.indexTitle,
    description: meta.indexDescription,
    alternates: {
      canonical: blogIndexPath(locale),
      languages: {
        es: `${siteUrl}${blogIndexPath("es")}`,
        en: `${siteUrl}${blogIndexPath("en")}`,
        fr: `${siteUrl}${blogIndexPath("fr")}`,
        "x-default": `${siteUrl}${blogIndexPath("es")}`,
      },
      // Declara el feed RSS del blog vía la Metadata API de Next.js en vez
      // de un <link> a mano en el <head> — genera
      // <link rel="alternate" type="application/rss+xml" href="...">.
      types: {
        "application/rss+xml": rssFeedPath(locale),
      },
    },
    openGraph: {
      type: "website",
      title: meta.indexTitle,
      description: meta.indexDescription,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: meta.indexTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.indexTitle,
      description: meta.indexDescription,
      images: [ogImageUrl],
    },
  };
}

export async function buildBlogPostMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const post = await getPostBySlug(slug, locale);
  if (!post) return {};

  // A diferencia de servicios/equipo, no asumimos que las tres versiones
  // existen siempre — un slug que todavía no se tradujo/publicó en un
  // locale (contenido nuevo agregado solo en es, por ejemplo) simplemente
  // no tiene esa entrada en `languages`, en vez de apuntar a un 404.
  const existingLocales = await Promise.all(
    (["es", "en", "fr"] as const).map(async (loc) => ((await getPostBySlug(slug, loc)) ? loc : null))
  );
  const languages = Object.fromEntries(
    existingLocales.filter((loc): loc is Locale => loc !== null).map((loc) => [loc, `${siteUrl}${blogPostPath(loc, slug)}`])
  );

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: blogPostPath(locale, slug),
      languages,
    },
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImageUrl],
    },
  };
}
