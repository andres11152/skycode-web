import Link from "next/link";
import type { BlogPost } from "@/content/blogShared";
import { readingTime } from "@/content/blogShared";
import { blogPostPath } from "@/lib/blogPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { formatDate, cn } from "@/lib/utils";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { PostCover } from "@/components/blog/PostCover";

/**
 * Tarjeta de un post con portada: la portada de la tarjeta y la del
 * encabezado del artículo comparten `post-cover-{slug}` — al navegar, hace
 * morph de una a otra (ver `ui/CoverTransition.tsx` para el límite: solo si
 * la tarjeta está visible en el primer pantallazo). Una página no debe
 * renderizar dos tarjetas del mismo post (el `name` es único por página).
 */
export function PostCard({
  post,
  headingLevel = "h3",
  readingTimeSuffix,
  locale = defaultLocale,
  className,
}: {
  post: BlogPost;
  headingLevel?: "h2" | "h3";
  readingTimeSuffix: string;
  locale?: Locale;
  className?: string;
}) {
  const Heading = headingLevel;

  return (
    <Link
      href={blogPostPath(locale, post.slug)}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background outline-none transition-colors duration-200 hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <MorphTransition name={`post-cover-${post.slug}`}>
        <PostCover post={post} className="aspect-[16/9] w-full border-b border-foreground/10" />
      </MorphTransition>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          <span aria-hidden="true">·</span>
          <span>
            {readingTime(post)} {readingTimeSuffix}
          </span>
        </div>
        <Heading
          className={cn(
            "mt-3 font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong",
            headingLevel === "h2" ? "text-2xl" : "text-xl",
          )}
        >
          {post.title}
        </Heading>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80 line-clamp-3">{post.description}</p>
      </div>
    </Link>
  );
}
