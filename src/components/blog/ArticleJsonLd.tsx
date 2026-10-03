import type { BlogPost } from "@/content/blogShared";
import { getBlogMeta } from "@/content/blogShared";
import { blogIndexPath, blogPostPath, authorUrl } from "@/lib/blogPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";
import { stripInlineLinks } from "@/lib/inlineLinks";

/**
 * Extraído de `app/blog/[slug]/page.tsx` para poder reutilizarlo en las
 * tres variantes de locale (`/blog`, `/en/blog`, `/fr/blog`) sin triplicar
 * el JSON-LD a mano — mismo criterio que `ServiceJsonLd`.
 */
export function ArticleJsonLd({ post, locale }: { post: BlogPost; locale: Locale }) {
  const meta = getBlogMeta(locale);
  const url = `${siteUrl}${blogPostPath(locale, post.slug)}`;
  const homePath = localeHomePath(locale);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    // Antes igual a `datePublished` siempre (el mismo campo hacía las dos
    // funciones) — `updatedAt` es un campo real y separado en el contenido
    // ahora, ver la nota en content/blog.ts.
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author, url: authorUrl(locale, post.authorSlug) },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: { "@type": "ImageObject", url: ogImageUrl },
    },
    image: ogImageUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
    inLanguage: locale,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: meta.breadcrumbHome, item: `${siteUrl}${homePath}` },
      { "@type": "ListItem", position: 2, name: meta.breadcrumbBlog, item: `${siteUrl}${blogIndexPath(locale)}` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  // FAQPage solo si el post trae bloques `faq` — sin preguntas no se emite
  // un FAQPage vacío. El texto va sin la sintaxis de enlace interno.
  const faqItems = post.content.flatMap((block) => (block.type === "faq" ? block.items : []));
  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: locale,
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </>
  );
}
