import type { BlogPost } from "@/content/blogShared";
import { getBlogMeta } from "@/content/blogShared";
import { blogIndexPath, blogPostPath, authorUrl } from "@/lib/blogPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import { buildPersonNode, organizationRef, serializeJsonLd, websiteRef, type JsonLdNode } from "@/lib/jsonLd";
import type { PublicTeamMember } from "@/content/teamShared";
import { personId } from "@/lib/teamPaths";
import { stripInlineLinks } from "@/lib/inlineLinks";

/**
 * Extraído de `app/blog/[slug]/page.tsx` para poder reutilizarlo en las
 * tres variantes de locale (`/blog`, `/en/blog`, `/fr/blog`) sin triplicar
 * el JSON-LD a mano — mismo criterio que `ServiceJsonLd`.
 */
export function ArticleJsonLd({ post, locale, author }: { post: BlogPost; locale: Locale; author?: PublicTeamMember | null }) {
  const meta = getBlogMeta(locale);
  const url = `${siteUrl}${blogPostPath(locale, post.slug)}`;
  const homePath = localeHomePath(locale);
  const articleId = `${url}#article`;
  const breadcrumbId = `${url}#breadcrumb`;

  const faqItems = post.content.flatMap((block) => (block.type === "faq" ? block.items : []));

  // Un solo `@graph` por artículo (WebPage, BlogPosting, BreadcrumbList y, si hay bloques `faq`,
  // FAQPage). La organización y el sitio se referencian por `@id` (definidos en el layout raíz).
  const graph: JsonLdNode[] = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: post.title,
      inLanguage: locale,
      isPartOf: websiteRef(),
      breadcrumb: { "@id": breadcrumbId },
      mainEntity: { "@id": articleId },
    },
    {
      "@type": "BlogPosting",
      "@id": articleId,
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      // `updatedAt` es un campo real y separado de `publishedAt` (ver la nota en content/blog.ts).
      dateModified: post.updatedAt,
      // `@id` = el de la entidad Person del autor (lib/jsonLd.ts::buildPersonNode), la misma en los tres
      // idiomas y definida con todo su detalle en la página del autor. Con el perfil público cargado se
      // suman cargo, foto y perfiles externos (E-E-A-T); sin él, nombre y URL.
      author: author
        ? buildPersonNode(author, locale)
        : { "@type": "Person", "@id": personId(post.authorSlug), name: post.author, url: authorUrl(locale, post.authorSlug) },
      publisher: { ...organizationRef(), logo: { "@type": "ImageObject", url: `${siteUrl}/logo-mark.png` } },
      isPartOf: websiteRef(),
      // Imagen propia del post (opengraph-image.tsx de su ruta), no la genérica.
      image: `${url}/opengraph-image`,
      mainEntityOfPage: { "@id": url },
      keywords: post.tags.join(", "),
      inLanguage: locale,
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: meta.breadcrumbHome, item: `${siteUrl}${homePath}` },
        { "@type": "ListItem", position: 2, name: meta.breadcrumbBlog, item: `${siteUrl}${blogIndexPath(locale)}` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  // FAQPage solo si el post trae bloques `faq` — sin preguntas no se emite uno vacío. El texto va
  // sin la sintaxis de enlace interno.
  if (faqItems.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      inLanguage: locale,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  );
}
