import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPosts, getPostBySlug } from "@/content/blog";
import { ArticleView } from "@/components/blog/ArticleView";
import { ArticleJsonLd } from "@/components/blog/ArticleJsonLd";
import { buildBlogPostMetadata } from "@/lib/blogMetadata";

export async function generateStaticParams() {
  const posts = await getBlogPosts("en");
  return posts.map((post) => ({ slug: post.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildBlogPostMetadata("en", slug);
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function BlogPostPageEn({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug, "en");

  if (!post) {
    notFound();
  }

  return (
    <>
      <ArticleJsonLd post={post} locale="en" />
      <ArticleView post={post} locale="en" />
    </>
  );
}
