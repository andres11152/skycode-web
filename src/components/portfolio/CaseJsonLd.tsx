import { getPortfolioSectionContent } from "@/content/projects";
import type { PortfolioProject } from "@/content/portfolioShared";
import { organizationRef, serializeJsonLd, websiteRef, type JsonLdNode } from "@/lib/jsonLd";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { withoutTodos } from "@/lib/todoPlaceholders";

/**
 * JSON-LD de un caso de estudio, en un solo `@graph`:
 *   - WebPage → Article (el caso: problema, enfoque, stack y resultados) → SoftwareApplication (lo que se
 *     construyó), con SkyCode como autor y editor por `@id`;
 *   - BreadcrumbList.
 * Solo se publican datos que existen en el caso: las capacidades como `featureList`, el stack como
 * `keywords` y las métricas REALES (cifras cargadas en el dashboard) como `additionalProperty`. Sin
 * métricas no se emite ninguna: un resultado medible se carga con su dato real, nunca se infiere. El
 * testimonio no se marca como `Review` (Google exige una valoración y aquí no hay una verificable).
 */
export function CaseJsonLd({ project, locale, modifiedAt }: { project: PortfolioProject; locale: Locale; modifiedAt?: string | null }) {
  const copy = getPortfolioSectionContent(locale);
  const url = `${siteUrl}${portfolioCasePath(locale, project.slug)}`;
  const coverUrl = project.coverImage?.variants.lg ?? ogImageUrl;
  const homePath = localeHomePath(locale);
  const articleId = `${url}#article`;
  const softwareId = `${url}#software`;
  const breadcrumbId = `${url}#breadcrumb`;

  const capabilities = withoutTodos(project.capabilities);
  const technologies = project.technologies.map((technology) => technology.name);
  const metrics = withoutTodos(project.metrics.filter((metric) => metric.value.trim() && metric.label.trim()));
  const published = project.publishedAt;
  const modified = modifiedAt ?? published;

  const graph: JsonLdNode[] = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: project.title,
      inLanguage: locale,
      isPartOf: websiteRef(),
      breadcrumb: { "@id": breadcrumbId },
      mainEntity: { "@id": articleId },
      primaryImageOfPage: coverUrl,
    },
    {
      "@type": "Article",
      "@id": articleId,
      headline: project.title,
      description: project.summary,
      articleSection: copy.detail.caseStudyLabel,
      inLanguage: locale,
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      image: coverUrl,
      author: organizationRef(),
      publisher: { ...organizationRef(), logo: { "@type": "ImageObject", url: `${siteUrl}/logo-mark.png` } },
      isPartOf: websiteRef(),
      about: { "@id": softwareId },
      mainEntityOfPage: { "@id": url },
      ...(technologies.length + capabilities.length > 0 ? { keywords: [...technologies, ...capabilities].join(", ") } : {}),
    },
    {
      "@type": "SoftwareApplication",
      "@id": softwareId,
      name: project.title,
      description: project.summary,
      inLanguage: locale,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      image: coverUrl,
      url: project.liveUrl ?? url,
      author: organizationRef(),
      creator: organizationRef(),
      ...(capabilities.length > 0 ? { featureList: capabilities } : {}),
      ...(metrics.length > 0
        ? { additionalProperty: metrics.map((metric) => ({ "@type": "PropertyValue", name: metric.label, value: metric.value })) }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: copy.breadcrumb.home, item: homePath === "/" ? siteUrl : `${siteUrl}${homePath}` },
        { "@type": "ListItem", position: 2, name: copy.breadcrumb.portfolio, item: `${siteUrl}${portfolioIndexPath(locale)}` },
        { "@type": "ListItem", position: 3, name: project.title, item: url },
      ],
    },
  ];

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />;
}
