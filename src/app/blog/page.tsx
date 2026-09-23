import type { Metadata } from "next";
import { getBlogPosts } from "@/content/blog";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { buildBlogIndexMetadata } from "@/lib/blogMetadata";

export const metadata: Metadata = buildBlogIndexMetadata("es");

// Fallback de seguridad — la revalidación real ocurre bajo demanda
// (`revalidatePath` al aprobar/despublicar/borrar un artículo, ver
// app/api/articles/[id]/publish/route.ts) — esto solo cubre el caso de que
// esa llamada falle por algún motivo, sin dejar la página estática para
// siempre.
export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getBlogPosts("es");
  return <BlogIndexView locale="es" posts={posts} />;
}
