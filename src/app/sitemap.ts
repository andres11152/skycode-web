import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/content/blog";
import { legalDocuments } from "@/content/legal";
import { getPublishedPortfolioLocaleMap } from "@/lib/queries/portfolio";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { portfolioCaseAlternates, portfolioIndexAlternates } from "@/lib/portfolioMetadata";
import { services } from "@/content/services";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { teamPath } from "@/lib/teamMetadata";
import { estimatorPath } from "@/lib/estimatorMetadata";
import { faqPath } from "@/lib/faqPaths";
import { faqLanguageAlternates } from "@/lib/faqMetadata";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { getPortfolioLastModifiedBySlug, getTeamLastModified } from "@/lib/queries/lastModified";
import { siteUrl } from "@/lib/site";
import lastmodData from "@/content/lastmod.json";

// Ya no es `force-static` sin revalidación: los posts del blog viven en
// Postgres desde la Fase 3 (ver content/blog.ts) y pueden publicarse sin
// deploy — este fallback de una hora cubre el caso de que la revalidación
// bajo demanda (`revalidatePath("/sitemap.xml")` al publicar, ver
// app/api/articles/[id]/publish/route.ts) falle por algún motivo.
export const revalidate = 3600;

// Fecha de último cambio de contenido de una página estática, generada desde
// git por scripts/generate-lastmod.mjs. Si falta la clave, se omite el
// <lastmod> en vez de inventar una fecha.
const STATIC_LASTMOD: Record<string, string> = lastmodData;
const staticLastmod = (key: string): string | undefined => STATIC_LASTMOD[key];

/** La más reciente de varias fechas ISO (ignora las ausentes). */
function newest(...dates: (string | null | undefined)[]): string | undefined {
  const valid = dates.filter((d): d is string => Boolean(d));
  return valid.length ? valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeLanguages = {
    // La raíz va SIN barra: es la forma que emiten el canonical y el hreflang de la home (Next la normaliza
    // así), y la <loc> del sitemap debe coincidir exactamente con ellos.
    es: siteUrl,
    en: `${siteUrl}/en`,
    fr: `${siteUrl}/fr`,
    "x-default": siteUrl,
  };

  const [postsEs, postsEn, postsFr, portfolioUpdated, teamUpdated] = await Promise.all([
    getBlogPosts("es"),
    getBlogPosts("en"),
    getBlogPosts("fr"),
    getPortfolioLastModifiedBySlug(),
    getTeamLastModified(),
  ]);
  const postsByLocale = { es: postsEs, en: postsEn, fr: postsFr };
  const newestPost = (locale: "es" | "en" | "fr") => newest(...postsByLocale[locale].map((p) => p.updatedAt));
  const newestProject = newest(...Object.values(portfolioUpdated));

  const staticRoutes: MetadataRoute.Sitemap = [
    // La home muestra los últimos artículos y casos: se mueve con ellos.
    ...(["es", "en", "fr"] as const).map((locale) => ({
      url: locale === "es" ? siteUrl : `${siteUrl}/${locale}`,
      lastModified: newest(staticLastmod(`home:${locale}`), newestPost(locale), newestProject),
      changeFrequency: "monthly" as const,
      priority: 1,
      alternates: { languages: homeLanguages },
    })),
    ...(["es", "en", "fr"] as const).map((locale) => ({
      url: `${siteUrl}${portfolioIndexPath(locale)}`,
      lastModified: newest(staticLastmod(`portfolio-index:${locale}`), newestProject),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: portfolioIndexAlternates() },
    })),
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
    lastModified: newest(staticLastmod(`blog-index:${locale}`), newestPost(locale)),
    changeFrequency: "weekly",
    priority: 0.8,
    alternates: { languages: blogIndexLanguages },
  }));

  const postRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).flatMap((locale) =>
    postsByLocale[locale].map((post) => {
      const languages = Object.fromEntries(
        (["es", "en", "fr"] as const)
          .filter((loc) => postsByLocale[loc].some((p) => p.slug === post.slug))
          .map((loc) => [loc, `${siteUrl}${blogPostPath(loc, post.slug)}`])
      );
      const defaultLoc = postsByLocale["es"].some((p) => p.slug === post.slug) ? "es" : locale;
      languages["x-default"] = `${siteUrl}${blogPostPath(defaultLoc, post.slug)}`;
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
  // Un caso solo aparece en /en o /fr si tiene traducción REAL a ese idioma
  // (sin ella se serviría español bajo otra URL): el hreflang también se arma
  // solo con los idiomas disponibles.
  const portfolioLocaleMap = await getPublishedPortfolioLocaleMap();
  const projectRoutes: MetadataRoute.Sitemap = portfolioLocaleMap.flatMap(({ slug, locales: available }) =>
    (["es", "en", "fr"] as const)
      .filter((locale) => locale === "es" || available.includes(locale))
      .map((locale) => ({
        url: `${siteUrl}${portfolioCasePath(locale, slug)}`,
        lastModified: portfolioUpdated[slug],
        changeFrequency: "monthly" as const,
        priority: 0.4,
        alternates: { languages: portfolioCaseAlternates(slug, available) },
      }))
  );

  const serviceRoutes: MetadataRoute.Sitemap = services.flatMap((service) => {
    const languages = {
      es: `${siteUrl}${servicePath("es", service.slug)}`,
      en: `${siteUrl}${servicePath("en", service.slug)}`,
      fr: `${siteUrl}${servicePath("fr", service.slug)}`,
      "x-default": `${siteUrl}${servicePath("es", service.slug)}`,
    };
    return (["es", "en", "fr"] as const).map((locale) => ({
      url: `${siteUrl}${servicePath(locale, service.slug)}`,
      // Por página: su fecha solo avanza cuando cambia SU contenido (hash en lastmod-hashes.json), no el de otro servicio.
      lastModified: staticLastmod(`services-detail:${locale}:${service.slug}`) ?? staticLastmod(`services-detail:${locale}`),
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
    lastModified: staticLastmod(`services-index:${locale}`),
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
    lastModified: newest(staticLastmod(`team:${locale}`), teamUpdated),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: { languages: teamLanguages },
  }));

  const estimatorLanguages = {
    es: `${siteUrl}${estimatorPath("es")}`,
    en: `${siteUrl}${estimatorPath("en")}`,
    fr: `${siteUrl}${estimatorPath("fr")}`,
    "x-default": `${siteUrl}${estimatorPath("es")}`,
  };
  const estimatorRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).map((locale) => ({
    url: `${siteUrl}${estimatorPath(locale)}`,
    lastModified: staticLastmod(`estimator:${locale}`),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: { languages: estimatorLanguages },
  }));

  // Páginas de preguntas frecuentes: el slug se traduce por idioma
  // (`/preguntas-frecuentes`, `/en/faq`, `/fr/faq`), así que el hreflang
  // cruzado es lo que las relaciona — no un segmento común.
  const faqLanguages = faqLanguageAlternates();
  const faqRoutes: MetadataRoute.Sitemap = (["es", "en", "fr"] as const).map((locale) => ({
    url: `${siteUrl}${faqPath(locale)}`,
    lastModified: staticLastmod(`faq:${locale}`),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: { languages: faqLanguages },
  }));

  // Página local de Bogotá: solo español, sin `alternates.languages` (no existe
  // versión en inglés ni francés, ver content/bogota.ts).
  const bogotaRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}${bogotaPagePath}`,
      lastModified: staticLastmod("bogota:es"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  return [
    ...staticRoutes,
    ...blogIndexRoutes,
    ...postRoutes,
    ...legalRoutes,
    ...projectRoutes,
    ...serviceRoutes,
    ...servicesIndexRoutes,
    ...teamRoutes,
    ...estimatorRoutes,
    ...faqRoutes,
    ...bogotaRoutes,
  ];
}
