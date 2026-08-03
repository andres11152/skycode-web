import type { MetadataRoute } from "next";
import { blogPosts } from "@/content/blog";
import { legalDocuments } from "@/content/legal";
import { projects } from "@/content/projects";
import { services } from "@/content/services";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { teamPath } from "@/lib/teamMetadata";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const homeLanguages = {
    es: `${siteUrl}/`,
    en: `${siteUrl}/en`,
    fr: `${siteUrl}/fr`,
    "x-default": `${siteUrl}/`,
  };

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: homeLanguages },
    },
    {
      url: `${siteUrl}/en`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: homeLanguages },
    },
    {
      url: `${siteUrl}/fr`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: homeLanguages },
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/portafolio`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const legalRoutes: MetadataRoute.Sitemap = legalDocuments.map((doc) => ({
    url: `${siteUrl}/${doc.slug}`,
    lastModified: doc.updatedAt,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteUrl}/portafolio/${project.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.flatMap((service) => {
    const languages = {
      es: `${siteUrl}${servicePath("es", service.slug)}`,
      en: `${siteUrl}${servicePath("en", service.slug)}`,
      fr: `${siteUrl}${servicePath("fr", service.slug)}`,
      "x-default": `${siteUrl}${servicePath("es", service.slug)}`,
    };
    return (["es", "en", "fr"] as const).map((locale) => ({
      url: `${siteUrl}${servicePath(locale, service.slug)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages },
    }));
  });

  const servicesIndexLanguages = {
    es: `${siteUrl}${servicesIndexPath("es")}`,
    en: `${siteUrl}${servicesIndexPath("en")}`,
    fr: `${siteUrl}${servicesIndexPath("fr")}`,
    "x-default": `${siteUrl}${servicesIndexPath("es")}`,
  };
  const servicesIndexRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).map((locale) => ({
    url: `${siteUrl}${servicesIndexPath(locale)}`,
    changeFrequency: "monthly",
    priority: 0.8,
    alternates: { languages: servicesIndexLanguages },
  }));

  const teamLanguages = {
    es: `${siteUrl}${teamPath("es")}`,
    en: `${siteUrl}${teamPath("en")}`,
    fr: `${siteUrl}${teamPath("fr")}`,
    "x-default": `${siteUrl}${teamPath("es")}`,
  };
  const teamRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).map((locale) => ({
    url: `${siteUrl}${teamPath(locale)}`,
    changeFrequency: "monthly",
    priority: 0.5,
    alternates: { languages: teamLanguages },
  }));

  return [
    ...staticRoutes,
    ...postRoutes,
    ...legalRoutes,
    ...projectRoutes,
    ...serviceRoutes,
    ...servicesIndexRoutes,
    ...teamRoutes,
  ];
}
