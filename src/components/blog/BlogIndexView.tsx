import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { getBlogMeta, readingTime, type BlogPost } from "@/content/blogShared";
import type { PublicTeamMember } from "@/content/teamShared";
import { blogPostPath } from "@/lib/blogPaths";
import { rssFeedPath } from "@/lib/rss";
import { siteUrl } from "@/lib/site";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { PostCard } from "@/components/blog/PostCard";
import { PostCover } from "@/components/blog/PostCover";
import { PostRow } from "@/components/blog/PostRow";
import { RssSubscribe } from "@/components/blog/RssSubscribe";
import { AuthorChip } from "@/components/blog/AuthorChip";


/**
 * `/blog` — Server Component: sin ninguna isla cliente propia (los
 * revelados son CSS ligado al scroll). Hero → post destacado → dos tarjetas
 * → listado en filas → banda de RSS (oscura, cierra la página).
 *
 * `posts` y `authors` llegan resueltos desde el servidor (Postgres). El
 * hero no lleva animación de entrada: el H1 es el LCP.
 */
export function BlogIndexView({
  locale = defaultLocale,
  posts,
  authors,
}: {
  locale?: Locale;
  posts: BlogPost[];
  authors: Record<string, PublicTeamMember>;
}) {
  const meta = getBlogMeta(locale);
  const [featured, ...rest] = posts;
  const cards = rest.slice(0, 2);
  const rows = rest.slice(2);

  return (
    <main id="main-content">
      <section className="px-6 pt-28 pb-14 sm:pt-36 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6">
          <SectionEyebrow>{meta.badge}</SectionEyebrow>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {meta.heading}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{meta.intro}</p>
        </div>
      </section>

      {featured && (
        <section aria-label={meta.featuredLabel} className="px-6 pb-16 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <Link
              href={blogPostPath(locale, featured.slug)}
              className="group grid gap-8 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-14"
            >
              <MorphTransition name={`post-cover-${featured.slug}`}>
                <PostCover
                  post={featured}
                  className="aspect-[16/10] w-full rounded-xl border border-foreground/10"
                />
              </MorphTransition>
              <div className="flex flex-col items-start gap-5">
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                  {meta.featuredLabel}
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-4xl">
                  {featured.title}
                </h2>
                <p className="text-lg leading-relaxed text-foreground/80 line-clamp-4">{featured.description}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <AuthorChip name={featured.author} member={authors[featured.authorSlug]} />
                  <span className="text-sm text-foreground/70">
                    <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt, locale)}</time>
                    <span aria-hidden="true"> · </span>
                    {readingTime(featured)} {meta.readingTimeSuffix}
                  </span>
                </div>
                <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-accent-strong">
                  {meta.featuredCta}
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="blog-more" className="border-t border-foreground/10 px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 id="blog-more" className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
              {meta.moreHeading}
            </h2>

            {cards.length > 0 && (
              <ul className="mt-8 grid gap-6 md:grid-cols-2">
                {cards.map((post) => (
                  <li key={post.slug} className="scroll-reveal">
                    <PostCard post={post} headingLevel="h3" readingTimeSuffix={meta.readingTimeSuffix} locale={locale} />
                  </li>
                ))}
              </ul>
            )}

            {rows.length > 0 && (
              <div className="mt-12 border-t border-foreground/10">
                {rows.map((post) => (
                  <PostRow
                    key={post.slug}
                    post={post}
                    author={authors[post.authorSlug]}
                    readingTimeSuffix={meta.readingTimeSuffix}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="blog-rss" className="bg-foreground px-6 py-20 text-background sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 id="blog-rss" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {meta.rssTitle}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-background/80">{meta.rssDescription}</p>
          </div>
          <RssSubscribe
            feedUrl={`${siteUrl}${rssFeedPath(locale)}`}
            feedPath={rssFeedPath(locale)}
            labels={{
              cta: meta.rssCta,
              title: meta.rssModalTitle,
              description: meta.rssModalDescription,
              copy: meta.rssCopy,
              copied: meta.rssCopied,
              openFeedly: meta.rssOpenFeedly,
              openInoreader: meta.rssOpenInoreader,
              viewFeed: meta.rssViewFeed,
              close: meta.rssClose,
            }}
          />
        </div>
      </section>
    </main>
  );
}
