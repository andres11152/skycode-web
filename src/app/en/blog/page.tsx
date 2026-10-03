import type { Metadata } from "next";
import { getBlogPosts } from "@/content/blog";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { buildBlogIndexMetadata } from "@/lib/blogMetadata";
import { getBlogAuthors } from "@/lib/blogData";

export const metadata: Metadata = buildBlogIndexMetadata("en");
export const revalidate = 3600;

export default async function BlogPageEn() {
  const [posts, authors] = await Promise.all([getBlogPosts("en"), getBlogAuthors("en")]);
  return <BlogIndexView locale="en" posts={posts} authors={authors} />;
}
