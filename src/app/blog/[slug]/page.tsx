import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPosts, getPostBySlug } from "@/content/blog";
import { ArticleView } from "@/components/blog/ArticleView";
import { ArticleJsonLd } from "@/components/blog/ArticleJsonLd";
import { buildBlogPostMetadata } from "@/lib/blogMetadata";

export async function generateStaticParams() {
  const posts = await getBlogPosts("es");
  return posts.map((post) => ({ slug: post.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildBlogPostMetadata("es", slug);
}

// Fallback de seguridad — ver la misma nota en app/blog/page.tsx.
export const revalidate = 3600;
export const dynamicParams = true;

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug, "es");

  if (!post) {
    notFound();
  }

  return (
    <>
      <ArticleJsonLd post={post} locale="es" />
      <ArticleView post={post} locale="es" />
    </>
  );
}
