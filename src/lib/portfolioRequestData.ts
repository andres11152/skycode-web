import { cache } from "react";
import { getPublishedPortfolioLocaleMap, getPublishedPortfolioProjectBySlug } from "@/lib/queries/portfolio";
import type { Locale } from "@/lib/i18n";

// `cache()` de React: `generateMetadata` y la página del caso piden el mismo
// proyecto en la misma renderización. Con consultas independientes podían
// divergir (metadata sin dato, página con dato) y la página salía con el
// `<title>`/canonical de la home. Aquí ambas leen el MISMO resultado.
// Server-only (importa queries a Postgres).

export const getPortfolioProjectCached = cache(async (slug: string, locale: Locale) =>
  getPublishedPortfolioProjectBySlug(slug, locale)
);

export const getPortfolioLocaleMapCached = cache(async () => getPublishedPortfolioLocaleMap());
