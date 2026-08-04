import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects, getProjectBySlug } from "@/content/projects";
import { ProjectView } from "@/components/portfolio/ProjectView";
import { ogImageUrl, siteName, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  const coverUrl = project.coverImage ? `${siteUrl}${project.coverImage}` : ogImageUrl;

  return {
    title: `${project.title} | Casos de Éxito SKYCODE`,
    description: project.description,
    alternates: {
      canonical: `/portafolio/${project.slug}`,
    },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.description,
      images: [{ url: coverUrl, width: 1200, height: 630, alt: project.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.description,
      images: [coverUrl],
    },
  };
}

function ProjectJsonLd({ project }: { project: NonNullable<ReturnType<typeof getProjectBySlug>> }) {
  const url = `${siteUrl}/portafolio/${project.slug}`;
  const coverUrl = project.coverImage ? `${siteUrl}${project.coverImage}` : ogImageUrl;

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    image: coverUrl,
    url: project.link ?? url,
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
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <>
      <ProjectJsonLd project={project} />
      <ProjectView slug={slug} />
    </>
  );
}
