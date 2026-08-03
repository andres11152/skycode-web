"use client";

import { motion, useReducedMotion } from "framer-motion";
import { blogPosts } from "@/content/blog";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getBlogTeaserContent } from "@/content/blogTeaser";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { PostCard } from "@/components/blog/PostCard";
import { Button } from "@/components/ui/Button";

export function BlogTeaser({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const posts = blogPosts.slice(0, 3);
  const blogTeaserData = getBlogTeaserContent(locale);

  return (
    <section aria-label={blogTeaserData.sectionAria} className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {blogTeaserData.title}
            </h2>
            <p className="mt-3 text-foreground/80">
              {blogTeaserData.description}
            </p>
          </div>
          <Button
            href="/blog"
            variant="secondary"
            size="sm"
          >
            {blogTeaserData.viewAll}
          </Button>
        </div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post) => (
            <motion.article key={post.slug} variants={fadeUp(reduced)}>
              <PostCard post={post} readingTimeSuffix={blogTeaserData.readingTimeSuffix} />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
