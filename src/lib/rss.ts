import { getBlogMeta, getBlogPosts, type BlogBlock } from "@/content/blog";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { siteName, siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";

/** Ruta absoluta del feed de un locale — `/feed.xml` para es (default, sin prefijo), `/en/feed.xml`/`/fr/feed.xml` para el resto. */
export function rssFeedPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  return `${prefix}/feed.xml`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Concatena los bloques de un post en texto plano simple, para el `<description>` del item — no HTML, los lectores de feed lo muestran como texto. */
function blocksToPlainText(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "heading") return block.text;
      if (block.type === "list") return block.items.join(" — ");
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

/**
 * RSS 2.0 de los posts publicados de un locale, más reciente primero.
 * Usada por `GET /feed.xml`, `/en/feed.xml`, `/fr/feed.xml` — un feed
 * separado por idioma (no uno combinado) porque cada uno tiene su propio
 * `<language>` y sus propios lectores potenciales.
 */
export async function buildRssFeed(locale: Locale): Promise<string> {
  const meta = getBlogMeta(locale);
  const posts = [...(await getBlogPosts(locale))].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const blogUrl = `${siteUrl}${blogIndexPath(locale)}`;
  const selfUrl = `${siteUrl}${rssFeedPath(locale)}`;
  const now = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = `${siteUrl}${blogPostPath(locale, post.slug)}`;
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xmlEscape(blocksToPlainText(post.content))}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${xmlEscape(post.author)}</dc:creator>
      ${post.tags.map((tag) => `<category>${xmlEscape(tag)}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(`${siteName} — ${meta.indexTitle}`)}</title>
    <link>${blogUrl}</link>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(meta.indexDescription)}</description>
    <language>${locale}</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
