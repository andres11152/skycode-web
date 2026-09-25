"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { m as motion, useReducedMotion } from "framer-motion";
import type { BlogPost } from "@/content/blogShared";
import { getBlogMeta, readingTime } from "@/content/blogShared";
import { blogIndexPath } from "@/lib/blogPaths";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { formatDate, slugify } from "@/lib/utils";
import { ArticleBody } from "@/components/blog/ArticleBody";

export function ArticleView({ post, locale = defaultLocale }: { post: BlogPost; locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const headings = post.content.filter((block) => block.type === "heading");
  const meta = getBlogMeta(locale);
  const homePath = localeHomePath(locale);
  const blogPath = blogIndexPath(locale);
  const contactHref = `${homePath === "/" ? "" : homePath}/#contacto`;

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <ScrollProgress />
      <article className="mx-auto flex max-w-6xl flex-col gap-10">
        <nav aria-label={meta.breadcrumbAria}>
          <ol className="flex items-center gap-2 text-sm text-foreground/60">
            <li>
              <Link
                href={homePath}
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {meta.breadcrumbHome}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={blogPath}
                className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {meta.breadcrumbBlog}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/60">
                <span>{post.author}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>
                  {readingTime(post)} {meta.readingTimeSuffix}
                </span>
              </div>
            </header>

            <motion.div variants={fadeUp(reduced)} className="max-w-2xl">
              <ArticleBody blocks={post.content} />
            </motion.div>

            <motion.div variants={fadeUp(reduced)}>
              <Link
                href={blogPath}
                className="inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeft size={14} />
                {meta.backToBlog}
              </Link>
            </motion.div>
          </div>

          <motion.aside
            variants={fadeUp(reduced)}
            className="flex flex-col gap-6 lg:sticky lg:top-28 lg:h-fit"
          >
            {headings.length > 0 && (
              <nav aria-label={meta.tocHeading} className="rounded-xl border border-foreground/10 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  {meta.tocHeading}
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {headings.map((heading) => (
                    <li key={heading.text} className={heading.level === 3 ? "pl-4" : undefined}>
                      <a
                        href={`#${slugify(heading.text)}`}
                        className="rounded text-sm text-foreground/70 outline-none transition-colors hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
              <p className="text-base font-medium text-foreground">{meta.ctaQuestion}</p>
              <Button href={contactHref} variant="accent" size="md" className="mt-4 w-full">
                {meta.ctaButton}
              </Button>
            </div>
          </motion.aside>
        </div>
      </article>
    </main>
  );
}
