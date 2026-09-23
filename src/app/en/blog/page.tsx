import type { Metadata } from "next";
import { getBlogPosts } from "@/content/blog";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { buildBlogIndexMetadata } from "@/lib/blogMetadata";

export const metadata: Metadata = buildBlogIndexMetadata("en");
export const revalidate = 3600;

export default async function BlogPageEn() {
  const posts = await getBlogPosts("en");
  return <BlogIndexView locale="en" posts={posts} />;
}
