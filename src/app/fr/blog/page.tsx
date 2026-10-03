import type { Metadata } from "next";
import { getBlogPosts } from "@/content/blog";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { buildBlogIndexMetadata } from "@/lib/blogMetadata";
import { getBlogAuthors } from "@/lib/blogData";

export const metadata: Metadata = buildBlogIndexMetadata("fr");
export const revalidate = 3600;

export default async function BlogPageFr() {
  const [posts, authors] = await Promise.all([getBlogPosts("fr"), getBlogAuthors("fr")]);
  return <BlogIndexView locale="fr" posts={posts} authors={authors} />;
}
