import Link from "next/link";
import type { BlogPost } from "@/content/blogShared";
import { readingTime } from "@/content/blogShared";
import { blogPostPath } from "@/lib/blogPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { formatDate, cn } from "@/lib/utils";

export function PostCard({
  post,
  headingLevel = "h3",
  readingTimeSuffix,
  locale = defaultLocale,
}: {
  post: BlogPost;
  headingLevel?: "h2" | "h3";
  readingTimeSuffix: string;
  locale?: Locale;
}) {
  const Heading = headingLevel;

  return (
    <Link
      href={blogPostPath(locale, post.slug)}
      className="group flex h-full flex-col rounded-xl border border-foreground/10 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/60">
        <span>{post.tags[0]}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      </div>
      <Heading
        className={cn(
          "mt-3 tracking-tight text-foreground transition-colors",
          headingLevel === "h2"
            ? "text-2xl font-bold group-hover:text-accent"
            : "text-lg font-semibold group-hover:text-accent-strong",
        )}
      >
        {post.title}
      </Heading>
      <p className="mt-2 text-sm text-foreground/80">{post.description}</p>
      <span className="mt-4 text-xs text-foreground/60">
        {readingTime(post)} {readingTimeSuffix}
      </span>
    </Link>
  );
}
