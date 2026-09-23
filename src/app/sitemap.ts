import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/content/blog";
import { legalDocuments } from "@/content/legal";
import { projects } from "@/content/projects";
import { services } from "@/content/services";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { teamPath } from "@/lib/teamMetadata";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { siteUrl } from "@/lib/site";

// Ya no es `force-static` sin revalidación: los posts del blog viven en
// Postgres desde la Fase 3 (ver content/blog.ts) y pueden publicarse sin
// deploy — este fallback de una hora cubre el caso de que la revalidación
// bajo demanda (`revalidatePath("/sitemap.xml")` al publicar, ver
// app/api/articles/[id]/publish/route.ts) falle por algún motivo.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${siteUrl}/portafolio`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // El blog ya tiene versión en los tres idiomas (ver "Internacionalización"
  // en CLAUDE.md, sección actualizada) — mismo patrón que servicios/equipo:
  // un índice + posts por locale, con `alternates.languages` cruzados.
  const blogIndexLanguages = {
    es: `${siteUrl}${blogIndexPath("es")}`,
    en: `${siteUrl}${blogIndexPath("en")}`,
    fr: `${siteUrl}${blogIndexPath("fr")}`,
    "x-default": `${siteUrl}${blogIndexPath("es")}`,
  };
  const blogIndexRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).map((locale) => ({
    url: `${siteUrl}${blogIndexPath(locale)}`,
    changeFrequency: "weekly",
    priority: 0.8,
    alternates: { languages: blogIndexLanguages },
  }));

  const [postsEs, postsEn, postsFr] = await Promise.all([
    getBlogPosts("es"),
    getBlogPosts("en"),
    getBlogPosts("fr"),
  ]);
  const postsByLocale = { es: postsEs, en: postsEn, fr: postsFr };

  const postRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).flatMap((locale) =>
    postsByLocale[locale].map((post) => {
      const languages = Object.fromEntries(
        (["es", "en", "fr"] as const)
          .filter((loc) => postsByLocale[loc].some((p) => p.slug === post.slug))
          .map((loc) => [loc, `${siteUrl}${blogPostPath(loc, post.slug)}`])
      );
      return {
        url: `${siteUrl}${blogPostPath(locale, post.slug)}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      };
    })
  );

  const legalRoutes: MetadataRoute.Sitemap = legalDocuments.map((doc) => ({
    url: `${siteUrl}/${doc.slug}`,
    lastModified: doc.updatedAt,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // Prioridad deliberadamente por debajo de las páginas internas
  // (servicios/blog/equipo): siguen indexados y rankeando por sus propias
  // queries, pero no deberían competir con ellas como sitelinks. Ver la
  // nota en SiteNavigationJsonLd de app/layout.tsx — el sitemap es una
  // señal débil para esto, el enlazado interno pesa mucho más.
  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteUrl}/portafolio/${project.slug}`,
    changeFrequency: "monthly",
    priority: 0.4,
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
    priority: 0.7,
    alternates: { languages: teamLanguages },
  }));

  return [
    ...staticRoutes,
    ...blogIndexRoutes,
    ...postRoutes,
    ...legalRoutes,
    ...projectRoutes,
    ...serviceRoutes,
    ...servicesIndexRoutes,
    ...teamRoutes,
  ];
}
