import { NextResponse } from "next/server";
import { getBlogPosts } from "@/content/blog";
import { isLocale } from "@/lib/i18n";
import { logError } from "@/lib/logger";

/**
 * GET /api/articles/recent?locale=es&limit=4 - Sin sesión a propósito
 * (como /api/geo): es contenido ya público, solo lo consume el Footer
 * (`use client`, montado en el layout raíz sin saber el locale a nivel de
 * servidor — ver lib/useRecentArticles.ts) para listar "artículos
 * recientes" sin necesitar una segunda lectura del layout completo.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale") ?? "es";
  const locale = isLocale(localeParam) ? localeParam : "es";
  const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit")) || 4));

  try {
    const posts = await getBlogPosts(locale);
    const recent = posts.slice(0, limit).map((post) => ({ slug: post.slug, title: post.title }));
    return NextResponse.json({ posts: recent });
  } catch (error) {
    logError("❌ [API GET Recent Articles Error]", error);
    return NextResponse.json({ posts: [] }, { status: 200 });
  }
}
