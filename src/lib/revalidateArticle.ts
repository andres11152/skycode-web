import { revalidatePath } from "next/cache";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { rssFeedPath } from "@/lib/rss";
import { pingIndexNow } from "@/lib/indexNow";
import { siteUrl } from "@/lib/site";
import type { PublishResult } from "@/lib/queries/articles";

/**
 * Se llama después de publicar/despublicar/borrar un artículo publicado —
 * nunca desde el módulo de queries (`next/cache` solo funciona dentro de un
 * Route Handler/Server Action, no en un módulo reutilizado también por el
 * cron). Revalida la ruta del post, el índice del blog, el sitemap y el
 * feed RSS de ese locale — son las cuatro superficies públicas que leen de
 * `articles` (ver content/blog.ts, app/sitemap.ts, lib/rss.ts).
 *
 * `notifySearchEngines` solo tiene sentido al publicar (no al despublicar
 * o borrar, ahí no hay nada nuevo que rastrear) — hace ping a IndexNow con
 * la URL del post y la del índice del blog.
 */
export function revalidateArticlePaths(result: PublishResult, notifySearchEngines = false): void {
  revalidatePath(blogPostPath(result.locale, result.slug));
  revalidatePath(blogIndexPath(result.locale));
  revalidatePath("/sitemap.xml");
  revalidatePath(rssFeedPath(result.locale));

  if (notifySearchEngines) {
    void pingIndexNow([
      `${siteUrl}${blogPostPath(result.locale, result.slug)}`,
      `${siteUrl}${blogIndexPath(result.locale)}`,
    ]);
  }
}
