import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import type { BlogBlock, BlogPost } from "@/content/blogShared";
import { getBlogMeta, readingTime } from "@/content/blogShared";
import { getRelatedServiceSlugsForPost } from "@/content/relatedContent";
import { getServiceBySlug, type Service } from "@/content/services";
import { authorPath, blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import type { ArticleContext } from "@/lib/blogData";
import { defaultLocale, localeHomePath, t, type Locale } from "@/lib/i18n";
import { cn, formatDate, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { MorphTransition } from "@/components/ui/CoverTransition";
import { PageToc } from "@/components/ui/PageToc";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { AuthorChip } from "@/components/blog/AuthorChip";
import { PostCard } from "@/components/blog/PostCard";
import { PostCover } from "@/components/blog/PostCover";
import { RelatedServices } from "@/components/blog/RelatedServices";

const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";
const LINK_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * `/blog/[slug]` — Server Component: las únicas islas cliente son la barra
 * de progreso, el índice con scrollspy (`PageToc`) y el botón de copiar
 * código. El hero no lleva animación de entrada a propósito (el H1 es el LCP,
 * ver 509d3ba); lo que queda bajo el pliegue se revela con CSS ligado al
 * scroll. `context` (autor, relacionados, vecinos) llega resuelto desde la
 * página — ver `lib/blogData.ts`.
 */
export function ArticleView({
  post,
  locale = defaultLocale,
  context,
}: {
  post: BlogPost;
  locale?: Locale;
  context: ArticleContext;
}) {
  // Solo h2: los posts largos (ej. el marco de 6 pasos en h3 del post de
  // migración) llevaban el índice a ~20 entradas, más alto que la pantalla
  // dentro de un aside `sticky`.
  const headings = post.content.filter(
    (block): block is Extract<BlogBlock, { type: "heading" }> => block.type === "heading" && block.level === 2,
  );
  const tocItems = headings.map((heading) => ({ id: slugify(heading.text), label: heading.text }));

  const meta = getBlogMeta(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const blogPath = blogIndexPath(locale);
  const contactHref = `${prefix}/#contacto`;

  const { author, related, previous, next } = context;
  // 2–3 servicios, del más al menos relevante (content/relatedContent.ts, fuente única del enlazado blog ↔ servicios).
  const relatedServices = getRelatedServiceSlugsForPost(post.slug)
    .map((slug) => getServiceBySlug(slug, locale))
    .filter((service): service is Service => service !== undefined);
  const primaryServiceSlug = relatedServices[0]?.slug;
  // "Actualizado" solo si la revisión cayó en otro día que la publicación.
  const wasUpdated = formatDate(post.updatedAt, locale) !== formatDate(post.publishedAt, locale);

  return (
    <main id="main-content">
      <ScrollProgress />
      <article>
        <header className="px-6 pt-28 pb-12 sm:pt-36 sm:pb-16">
          <div className="mx-auto max-w-6xl">
            <nav aria-label={meta.breadcrumbAria}>
              <ol className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
                <li>
                  <Link href={homePath} className={cn("rounded hover:text-foreground", LINK_FOCUS)}>
                    {meta.breadcrumbHome}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={blogPath} className={cn("rounded hover:text-foreground", LINK_FOCUS)}>
                    {meta.breadcrumbBlog}
                  </Link>
                </li>
              </ol>
            </nav>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-center lg:gap-16">
              <div className="flex flex-col items-start gap-6">
                <ul className="flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <li key={tag} className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium tracking-wide text-foreground/80 uppercase">
                      {tag}
                    </li>
                  ))}
                </ul>
                <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <AuthorChip name={post.author} member={author} showRole />
                  <p className="text-sm leading-relaxed text-foreground/70">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                    <span aria-hidden="true"> · </span>
                    {readingTime(post)} {meta.readingTimeSuffix}
                    {wasUpdated && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={post.updatedAt}>{t(meta.updatedOn, { date: formatDate(post.updatedAt, locale) })}</time>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <MorphTransition name={`post-cover-${post.slug}`}>
                <PostCover post={post} className="aspect-[16/10] w-full rounded-xl border border-foreground/10 lg:aspect-[4/3]" />
              </MorphTransition>
            </div>
          </div>
        </header>

        <div className="border-t border-foreground/10 px-6 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-20">
            {tocItems.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                  <PageToc items={tocItems} label={meta.tocHeading} layoutId="article-toc-active" />
                </div>
              </aside>
            )}

            <div className={cn("min-w-0", tocItems.length === 0 && "lg:col-span-2")}>
              <div className="mx-auto flex max-w-[42rem] flex-col gap-14 lg:mx-0">
                {/* En móvil el índice va ARRIBA, antes del texto (no en un aside al final, donde ya no sirve). */}
                {tocItems.length > 0 && (
                  <details className="group rounded-xl border border-foreground/10 lg:hidden">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                      {meta.tocHeading}
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 rotate-90 transition-transform duration-200 group-open:-rotate-90 motion-reduce:transition-none"
                      />
                    </summary>
                    <ul className="flex flex-col border-t border-foreground/10 px-5 py-2">
                      {tocItems.map((item) => (
                        <li key={item.id}>
                          <a href={`#${item.id}`} className={cn("flex min-h-11 items-center rounded text-sm text-foreground/80 hover:text-foreground", LINK_FOCUS)}>
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <ArticleBody blocks={post.content} copyCodeLabel={meta.copyCode} copiedCodeLabel={meta.copiedCode} editorial />

                <RelatedServices
                  services={relatedServices}
                  heading={meta.servicesHeading}
                  ctaLabel={meta.serviceCta}
                  hrefFor={(slug) => `${prefix}/servicios/${slug}`}
                />

                {author && (
                  <section aria-label={meta.authorLabel} className="flex flex-col gap-5 border-t border-foreground/10 pt-10 sm:flex-row sm:items-start">
                    {author.photo && (
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-foreground/10 bg-foreground/5">
                        <Image src={author.photo} alt="" fill sizes="64px" className="object-cover object-top" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={LABEL}>{meta.authorLabel}</p>
                      <p className="mt-2 text-lg font-bold tracking-tight text-foreground">{author.name}</p>
                      <p className="text-sm text-foreground/70">{author.role}</p>
                      <p className="mt-3 text-base leading-relaxed text-foreground/80 line-clamp-4">{author.description}</p>
                      <Link
                        href={authorPath(locale, author.slug)}
                        className={cn("mt-4 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-foreground hover:text-accent-strong", LINK_FOCUS)}
                      >
                        {meta.authorProfile}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="article-related" className="border-t border-foreground/10 px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 id="article-related" className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
              {meta.relatedHeading}
            </h2>
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug} className="scroll-reveal">
                  <PostCard post={item} headingLevel="h3" readingTimeSuffix={meta.readingTimeSuffix} locale={locale} />
                </li>
              ))}
            </ul>

            {(previous || next) && (
              <nav aria-label={meta.relatedHeading} className="mt-14 grid gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
                {previous ? (
                  <Link href={blogPostPath(locale, previous.slug)} className={cn("group flex flex-col gap-2 bg-background p-6 sm:p-8", LINK_FOCUS)}>
                    <span className={cn(LABEL, "flex items-center gap-2")}>
                      <ArrowLeft size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none" />
                      {meta.prevLabel}
                    </span>
                    <span className="text-lg font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong">{previous.title}</span>
                  </Link>
                ) : (
                  <span aria-hidden="true" className="hidden bg-background sm:block" />
                )}
                {next && (
                  <Link href={blogPostPath(locale, next.slug)} className={cn("group flex flex-col gap-2 bg-background p-6 sm:items-end sm:p-8 sm:text-right", LINK_FOCUS)}>
                    <span className={cn(LABEL, "flex items-center gap-2")}>
                      {meta.nextLabel}
                      <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                    </span>
                    <span className="text-lg font-bold tracking-tight text-balance text-foreground transition-colors duration-200 group-hover:text-accent-strong">{next.title}</span>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="article-cta" className="bg-foreground px-6 py-20 text-background sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 id="article-cta" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {meta.ctaQuestion}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-background/80">{meta.ctaDescription}</p>
          </div>
          <Button
            href={contactHref}
            variant="accent"
            size="lg"
            className="focus-visible:ring-offset-foreground"
            data-contact-service={primaryServiceSlug}
          >
            {meta.ctaButton}
          </Button>
        </div>
      </section>

      <div className="border-t border-foreground/10 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <Link href={blogPath} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-medium text-foreground/70 transition-colors hover:text-foreground", LINK_FOCUS)}>
            <ArrowLeft size={14} aria-hidden="true" />
            {meta.backToBlog}
          </Link>
        </div>
      </div>
    </main>
  );
}
