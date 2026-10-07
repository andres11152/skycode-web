import { notFound } from "next/navigation";
import { ProjectView } from "@/components/portfolio/ProjectView";
import { getPostBySlug } from "@/content/blog";
import { pickRelatedPostSlugs } from "@/content/portfolioRelated";
import { getPortfolioSectionContent } from "@/content/projects";
import { getProjectHostname, type CaseRelatedLinks, type PortfolioProject } from "@/content/portfolioShared";
import { getServiceSlugsForProject, getServicesContent } from "@/content/services";
import { blogPostPath } from "@/lib/blogPaths";
import { servicePath } from "@/lib/serviceMetadata";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { getPortfolioProjectCached } from "@/lib/portfolioRequestData";
import { getPublishedPortfolioSlugs } from "@/lib/queries/portfolio";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";

function CaseJsonLd({ project, locale }: { project: PortfolioProject; locale: Locale }) {
  const copy = getPortfolioSectionContent(locale);
  const url = `${siteUrl}${portfolioCasePath(locale, project.slug)}`;
  const coverUrl = project.coverImage?.variants.lg ?? ogImageUrl;
  const homePath = localeHomePath(locale);

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.summary,
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    image: coverUrl,
    url: project.liveUrl ?? url,
    author: { "@type": "Organization", name: siteName, url: siteUrl },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: copy.breadcrumb.home, item: homePath === "/" ? siteUrl : `${siteUrl}${homePath}` },
      { "@type": "ListItem", position: 2, name: copy.breadcrumb.portfolio, item: `${siteUrl}${portfolioIndexPath(locale)}` },
      { "@type": "ListItem", position: 3, name: project.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

/**
 * Servicios aplicados en el caso y hasta 2 artículos del blog sobre esos
 * servicios, ya resueltos al idioma de la página. Un artículo que no existe
 * (o no está publicado) en este idioma simplemente no se enlaza: nunca se
 * manda a un visitante en inglés a un artículo en español sin aviso.
 */
async function getRelatedLinks(project: PortfolioProject, locale: Locale): Promise<CaseRelatedLinks> {
  const serviceSlugs = getServiceSlugsForProject(project.slug);
  const catalog = getServicesContent(locale).services;
  const services = serviceSlugs
    .map((slug) => catalog.find((service) => service.slug === slug))
    .filter((service): service is (typeof catalog)[number] => service !== undefined)
    .map((service) => ({ slug: service.slug, title: service.title, href: servicePath(locale, service.slug) }));

  const posts = (
    await Promise.all(
      pickRelatedPostSlugs(serviceSlugs, 2).map(async (slug) => {
        const post = await getPostBySlug(slug, locale);
        return post ? { slug, title: post.title, href: blogPostPath(locale, slug) } : null;
      }),
    )
  ).filter((post): post is { slug: string; title: string; href: string } => post !== null);

  return { services, posts };
}

/** Server Component compartido por `/portafolio/[slug]`, `/en/portfolio/[slug]` y `/fr/portfolio/[slug]`. */
export async function PortfolioCasePage({ locale, slug }: { locale: Locale; slug: string }) {
  const project = await getPortfolioProjectCached(slug, locale);
  if (!project) notFound();

  const allSlugs = await getPublishedPortfolioSlugs();
  const currentIndex = allSlugs.indexOf(slug);
  const nextSlug = allSlugs.length > 0 ? allSlugs[(currentIndex + 1) % allSlugs.length] : null;
  const nextProject =
    nextSlug && nextSlug !== slug ? await getPortfolioProjectCached(nextSlug, locale) : null;

  const related = await getRelatedLinks(project, locale);

  return (
    <>
      <CaseJsonLd project={project} locale={locale} />
      <ProjectView
        locale={locale}
        project={project}
        related={related}
        sectionCopy={getPortfolioSectionContent(locale)}
        nextProject={
          nextProject
            ? {
                slug: nextProject.slug,
                title: nextProject.title,
                clientLabel: nextProject.clientLabel,
                coverSrc: nextProject.coverImage?.variants.lg ?? null,
                coverAlt: nextProject.coverImage?.alt || nextProject.title,
                industryIcon: nextProject.industryIcon,
                hostname: getProjectHostname(nextProject),
              }
            : null
        }
      />
    </>
  );
}
