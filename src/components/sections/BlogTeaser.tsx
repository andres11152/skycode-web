import type { CSSProperties } from "react";
import type { BlogPost } from "@/content/blogShared";
import { getBlogTeaserContent } from "@/content/blogTeaser";
import { blogIndexPath } from "@/lib/blogPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { PostCard } from "@/components/blog/PostCard";
import { Button } from "@/components/ui/Button";
import { RevealWords } from "@/components/ui/RevealText";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { getUiContent } from "@/content/ui";

/** `posts` llega ya resuelto desde el servidor (HomeSections): `getBlogPosts` lee de Postgres desde la Fase 3. */
export function BlogTeaser({ locale = defaultLocale, posts }: { locale?: Locale; posts: BlogPost[] }) {
  const blogTeaserData = getBlogTeaserContent(locale);
  const rail = getUiContent(locale).rail;

  return (
    <section id="blog" aria-label={blogTeaserData.sectionAria} className="cv-auto [--cv-h:960px] lg:[--cv-h:700px] scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <SectionEyebrow className="reveal-up mb-3">{blogTeaserData.badge}</SectionEyebrow>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl" aria-label={blogTeaserData.title}>
              <RevealWords text={blogTeaserData.title} />
            </h2>
            <p className="mt-3 text-foreground/80">
              {blogTeaserData.description}
            </p>
          </div>
          <Button
            href={blogIndexPath(locale)}
            variant="secondary"
            size="md"
          >
            {blogTeaserData.viewAll}
          </Button>
        </div>

        {/* Revelado en CSS ligado al scroll (`.scroll-reveal` + `--i`). En móvil, carrusel deslizable
            (`SwipeRail`) en vez de tres tarjetas apiladas con portada (~2 pantallas). */}
        <SwipeRail
          as="div"
          label={blogTeaserData.sectionAria}
          labels={rail}
          className="sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          items={posts.map((post, index) => (
            <article key={post.slug} style={{ "--i": index } as CSSProperties} className="scroll-reveal h-full">
              <PostCard post={post} readingTimeSuffix={blogTeaserData.readingTimeSuffix} locale={locale} />
            </article>
          ))}
        />

      </div>
    </section>
  );
}
