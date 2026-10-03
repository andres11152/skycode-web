import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import type { BlogPost } from "@/content/blogShared";
import { readingTime } from "@/content/blogShared";
import type { PublicTeamMember } from "@/content/teamShared";
import { blogPostPath } from "@/lib/blogPaths";
import { formatDate } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { PostCover } from "@/components/blog/PostCover";
import { AuthorChip } from "@/components/blog/AuthorChip";

/** Fila del listado editorial (a partir del tercer post): portada pequeña a la izquierda, texto a la derecha — el mismo patrón que el índice del portafolio. */
export function PostRow({
  post,
  author,
  readingTimeSuffix,
  locale,
}: {
  post: BlogPost;
  author?: PublicTeamMember | null;
  readingTimeSuffix: string;
  locale: Locale;
}) {
  return (
    <Link
      href={blogPostPath(locale, post.slug)}
      className="group scroll-reveal grid gap-5 border-b border-foreground/10 py-8 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-center sm:gap-8"
    >
      <MorphTransition name={`post-cover-${post.slug}`}>
        <PostCover post={post} className="aspect-[16/9] w-full rounded-xl border border-foreground/10 sm:aspect-[4/3]" />
      </MorphTransition>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          <span aria-hidden="true">·</span>
          <span>
            {readingTime(post)} {readingTimeSuffix}
          </span>
        </div>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-2xl">
          {post.title}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/80 line-clamp-2">{post.description}</p>
        <AuthorChip name={post.author} member={author} className="mt-4" />
      </div>
      <ArrowUpRight
        size={22}
        aria-hidden="true"
        className="hidden shrink-0 text-foreground/60 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-strong motion-reduce:transform-none sm:block"
      />
    </Link>
  );
}
