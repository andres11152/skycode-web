"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getBlogMeta, type BlogPost } from "@/content/blogShared";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { PostCard } from "@/components/blog/PostCard";

/** `posts` llega ya resuelto desde el servidor (app/blog/page.tsx y sus variantes de locale) — `getBlogPosts` lee de Postgres desde la Fase 3. */
export function BlogIndexView({ locale = defaultLocale, posts }: { locale?: Locale; posts: BlogPost[] }) {
  const reduced = Boolean(useReducedMotion());
  const meta = getBlogMeta(locale);

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex max-w-2xl flex-col items-start gap-4 text-left">
          <span className="rounded-full border border-foreground/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-foreground/80">
            {meta.badge}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
            {meta.heading}
          </h1>
          <p className="max-w-2xl text-lg text-foreground/80">
            {meta.intro}
          </p>
        </div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post) => (
            <motion.article key={post.slug} variants={fadeUp(reduced)}>
              <PostCard post={post} headingLevel="h2" readingTimeSuffix={meta.readingTimeSuffix} locale={locale} />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
