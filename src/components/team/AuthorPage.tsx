import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GithubLogo, LinkedinLogo } from "@phosphor-icons/react/ssr";
import { PostCard } from "@/components/blog/PostCard";
import { Button } from "@/components/ui/Button";
import { getBlogMeta } from "@/content/blogShared";
import { getAuthorPageCopy } from "@/content/team";
import { getAuthorPosts, getAuthorProfile } from "@/lib/authorData";
import { blogIndexPath } from "@/lib/blogPaths";
import { buildPersonNode, serializeJsonLd, websiteRef } from "@/lib/jsonLd";
import { siteUrl } from "@/lib/site";
import { teamMemberPath, teamPath } from "@/lib/teamPaths";
import { localeHomePath, t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { withoutTodos } from "@/lib/todoPlaceholders";

const LINK_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LABEL = "font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * `/equipo/{slug}` — la página de cada persona (E-E-A-T): quién es, qué hace y qué ha publicado. Server
 * Component sin animación de entrada (el H1 puede ser el LCP). La entidad `Person` del JSON-LD es la
 * misma (`@id`) que cita cada artículo suyo como `author`. Todo el texto sale del perfil público que se
 * edita en el dashboard (`team_profiles`); no se escribe nada propio de la persona aquí.
 */
export async function AuthorPage({ locale, slug }: { locale: Locale; slug: string }) {
  const profile = await getAuthorProfile(slug, locale);
  if (!profile) notFound();

  const { member } = profile;
  const copy = getAuthorPageCopy(locale);
  const blogMeta = getBlogMeta(locale);
  const posts = await getAuthorPosts(slug, locale);

  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;
  const pageUrl = `${siteUrl}${teamMemberPath(locale, slug)}`;
  const profiles = withoutTodos(
    [
      member.linkedinUrl ? { href: member.linkedinUrl, label: copy.linkedinLabel, icon: "linkedin" as const } : null,
      member.githubUrl ? { href: member.githubUrl, label: copy.githubLabel, icon: "github" as const } : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null)
  );

  // ProfilePage → Person (la entidad completa: lib/jsonLd.ts::buildPersonNode) + migas.
  const graph = [
    {
      "@type": "ProfilePage",
      "@id": pageUrl,
      url: pageUrl,
      name: `${member.name}, ${member.role}`,
      inLanguage: locale,
      isPartOf: websiteRef(),
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      mainEntity: { "@id": buildPersonNode(member, locale)["@id"] },
    },
    buildPersonNode(member, locale),
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: copy.breadcrumbHome, item: homePath === "/" ? siteUrl : `${siteUrl}${homePath}` },
        { "@type": "ListItem", position: 2, name: copy.breadcrumbTeam, item: `${siteUrl}${teamPath(locale)}` },
        { "@type": "ListItem", position: 3, name: member.name, item: pageUrl },
      ],
    },
  ];

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />

      <header className="px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={copy.breadcrumbAria}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
              <li>
                <Link href={homePath} className={cn("rounded hover:text-foreground", LINK_FOCUS)}>
                  {copy.breadcrumbHome}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={teamPath(locale)} className={cn("rounded hover:text-foreground", LINK_FOCUS)}>
                  {copy.breadcrumbTeam}
                </Link>
              </li>
            </ol>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-16">
            <div className="flex flex-col items-start gap-6">
              <p className={LABEL}>{copy.teamLabel}</p>
              <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">{member.name}</h1>
              <p className="text-xl font-semibold text-foreground/80">{member.role}</p>
              <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">{member.description}</p>

              {profiles.length > 0 && (
                <ul aria-label={copy.profilesLabel} className="flex flex-wrap gap-3">
                  {profiles.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="me noopener noreferrer"
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/10 px-5 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-foreground/25",
                          LINK_FOCUS
                        )}
                      >
                        {item.icon === "linkedin" ? <LinkedinLogo size={18} aria-hidden="true" /> : <GithubLogo size={18} aria-hidden="true" />}
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <Link href={teamPath(locale)} className={cn("inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-foreground hover:text-accent-text", LINK_FOCUS)}>
                <ArrowLeft size={16} aria-hidden="true" />
                {copy.backToTeam}
              </Link>
            </div>

            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl border border-foreground/10 bg-foreground/5 lg:max-w-none">
              {member.photo ? (
                <Image src={member.photo} alt={member.name} fill priority sizes="(min-width: 1024px) 22rem, 90vw" className="object-cover object-top" />
              ) : (
                <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-6xl font-bold tracking-tight text-foreground/40">
                  {initials(member.name)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="author-articles" className="border-t border-foreground/10 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 id="author-articles" className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {t(copy.articlesHeading, { name: member.name })}
          </h2>
          {posts.length > 0 ? (
            <>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80">{t(copy.articlesIntro, { name: member.name })}</p>
              <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <PostCard post={post} headingLevel="h3" readingTimeSuffix={blogMeta.readingTimeSuffix} locale={locale} />
                  </li>
                ))}
              </ul>
              <p className="mt-10">
                <Link href={blogIndexPath(locale)} className={cn("inline-flex min-h-11 items-center rounded-full text-sm font-semibold text-foreground hover:text-accent-text", LINK_FOCUS)}>
                  {blogMeta.breadcrumbBlog}
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80">{t(copy.articlesEmpty, { name: member.name })}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="author-cta" className="border-t border-foreground/10 px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6">
          <h2 id="author-cta" className="max-w-2xl text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {copy.ctaTitle}
          </h2>
          <Button href={`${prefix}/#contacto`} variant="accent" size="lg">
            {copy.ctaButton}
          </Button>
        </div>
      </section>
    </main>
  );
}
