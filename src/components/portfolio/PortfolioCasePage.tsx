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
import { getPortfolioLastModifiedBySlug } from "@/lib/queries/lastModified";
import { CaseJsonLd } from "@/components/portfolio/CaseJsonLd";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { organizationRef } from "@/lib/jsonLd";

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
        return post ? { slug, title: post.title, href: blogPostPath(locale, post.slug) } : null;
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
  const modifiedAt = (await getPortfolioLastModifiedBySlug())[slug] ?? null;

  return (
    <>
      <CaseJsonLd project={project} locale={locale} modifiedAt={modifiedAt} />
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
