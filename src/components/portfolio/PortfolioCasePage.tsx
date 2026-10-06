import { notFound } from "next/navigation";
import { ProjectView } from "@/components/portfolio/ProjectView";
import { getPortfolioSectionContent } from "@/content/projects";
import { getProjectHostname, type PortfolioProject } from "@/content/portfolioShared";
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

/** Server Component compartido por `/portafolio/[slug]`, `/en/portfolio/[slug]` y `/fr/portfolio/[slug]`. */
export async function PortfolioCasePage({ locale, slug }: { locale: Locale; slug: string }) {
  const project = await getPortfolioProjectCached(slug, locale);
  if (!project) notFound();

  const allSlugs = await getPublishedPortfolioSlugs();
  const currentIndex = allSlugs.indexOf(slug);
  const nextSlug = allSlugs.length > 0 ? allSlugs[(currentIndex + 1) % allSlugs.length] : null;
  const nextProject =
    nextSlug && nextSlug !== slug ? await getPortfolioProjectCached(nextSlug, locale) : null;

  return (
    <>
      <CaseJsonLd project={project} locale={locale} />
      <ProjectView
        locale={locale}
        project={project}
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
