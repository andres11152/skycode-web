import type { Metadata } from "next";
import { getBlogPosts } from "@/content/blog";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { buildBlogIndexMetadata } from "@/lib/blogMetadata";

export const metadata: Metadata = buildBlogIndexMetadata("fr");
export const revalidate = 3600;

export default async function BlogPageFr() {
  const posts = await getBlogPosts("fr");
  return <BlogIndexView locale="fr" posts={posts} />;
}
