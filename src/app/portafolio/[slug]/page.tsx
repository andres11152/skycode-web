import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectView } from "@/components/portfolio/ProjectView";
import { getPublishedPortfolioProjectBySlug, getPublishedPortfolioSlugs } from "@/lib/queries/portfolio";
import { defaultLocale } from "@/lib/i18n";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";
import type { PortfolioProject } from "@/content/portfolioShared";

// Mismo fallback que /portafolio (ver ese archivo) — la revalidación real
// bajo demanda ocurre al cambiar el estado de publicación de un caso.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedPortfolioSlugs();
  return slugs.map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedPortfolioProjectBySlug(slug, defaultLocale);
  if (!project) return {};

  const coverUrl = project.coverImage?.variants.lg ?? ogImageUrl;

  return {
    title: `${project.title} | Casos de Éxito SKYCODE`,
    description: project.summary,
    alternates: {
      canonical: `/portafolio/${project.slug}`,
    },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
      images: [{ url: coverUrl, width: 1200, height: 630, alt: project.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.summary,
      images: [coverUrl],
    },
  };
}

function ProjectJsonLd({ project }: { project: PortfolioProject }) {
  const url = `${siteUrl}/portafolio/${project.slug}`;
  const coverUrl = project.coverImage?.variants.lg ?? ogImageUrl;

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.summary,
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
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Portafolio", item: `${siteUrl}/portafolio` },
      { "@type": "ListItem", position: 3, name: project.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getPublishedPortfolioProjectBySlug(slug, defaultLocale);

  if (!project) {
    notFound();
  }

  const allSlugs = await getPublishedPortfolioSlugs();
  const currentIndex = allSlugs.indexOf(slug);
  const nextSlug = allSlugs.length > 0 ? allSlugs[(currentIndex + 1) % allSlugs.length] : null;
  const nextProject =
    nextSlug && nextSlug !== slug
      ? await getPublishedPortfolioProjectBySlug(nextSlug, defaultLocale)
      : null;

  return (
    <>
      <ProjectJsonLd project={project} />
      <ProjectView
        project={project}
        nextProject={nextProject ? { slug: nextProject.slug, title: nextProject.title } : null}
      />
    </>
  );
}
