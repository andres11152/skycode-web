import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogMeta, getPostBySlug } from "@/content/blog";
import { rssFeedPath } from "@/lib/rss";
import { ogImageUrl, siteUrl } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { fitTitle, truncateAtWord } from "@/lib/seoText";

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
  // Nunca `{}`: la metadata vacía hereda la del layout raíz (título de la
  // home) y quedaba cacheada por ISR como si fuera válida. Sin dato → 404.
  if (!post) notFound();

  // A diferencia de servicios/equipo, no asumimos que las tres versiones
  // existen siempre — un slug que todavía no se tradujo/publicó en un
  // locale (contenido nuevo agregado solo en es, por ejemplo) simplemente
  // no tiene esa entrada en `languages`, en vez de apuntar a un 404.
  const existingLocales = await Promise.all(
    (["es", "en", "fr"] as const).map(async (loc) => ((await getPostBySlug(slug, loc)) ? loc : null))
  );
  const languages: Record<string, string> = Object.fromEntries(
    existingLocales.filter((loc): loc is Locale => loc !== null).map((loc) => [loc, `${siteUrl}${blogPostPath(loc, slug)}`])
  );
  // x-default al español (el locale sin prefijo), mismo criterio que
  // servicios y home — antes faltaba solo en los posts. Únicamente si la
  // versión en español existe, para no apuntar el default a un 404.
  if (languages.es) languages["x-default"] = languages.es;

  // `<title>` ≤50 (el layout agrega " | SkyCode") y descripción ≤155: red de
  // seguridad para posts con título largo — el H1 del artículo sigue siendo
  // `post.title` completo. Lo ideal es escribirlos ya dentro del límite.
  const seoTitle = fitTitle(post.title, 50);
  const seoDescription = truncateAtWord(post.description, 155);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: {
      canonical: blogPostPath(locale, slug),
      languages,
    },
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: seoTitle,
      description: seoDescription,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      // Sin `images` a propósito: la imagen de cada post la aporta
      // `opengraph-image.tsx` de su ruta (lib/blogOgImage.tsx). Declararla
      // aquí la pisaría con la imagen genérica compartida.
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    },
  };
}
