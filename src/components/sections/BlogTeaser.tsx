"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { BlogPost } from "@/content/blogShared";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getBlogTeaserContent } from "@/content/blogTeaser";
import { blogIndexPath } from "@/lib/blogPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { PostCard } from "@/components/blog/PostCard";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

/** `posts` llega ya resuelto desde el servidor (HomeSections) — `getBlogPosts` lee de Postgres desde la Fase 3, un componente cliente no puede llamarlo directo. */
export function BlogTeaser({ locale = defaultLocale, posts }: { locale?: Locale; posts: BlogPost[] }) {
  const reduced = Boolean(useReducedMotion());
  const blogTeaserData = getBlogTeaserContent(locale);

  return (
    <section aria-label={blogTeaserData.sectionAria} className="scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{blogTeaserData.badge}</SectionEyebrow>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {blogTeaserData.title}
            </h2>
            <p className="mt-3 text-foreground/80">
              {blogTeaserData.description}
            </p>
          </div>
          <Button
            href={blogIndexPath(locale)}
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
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post) => (
            <motion.article key={post.slug} variants={fadeUp(reduced)}>
              <PostCard post={post} readingTimeSuffix={blogTeaserData.readingTimeSuffix} locale={locale} />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
