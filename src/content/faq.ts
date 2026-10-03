import faqDataEs from "./locales/es/faq.json";
import faqDataEn from "./locales/en/faq.json";
import faqDataFr from "./locales/fr/faq.json";
import faqPageEs from "./locales/es/faq-page.json";
import faqPageEn from "./locales/en/faq-page.json";
import faqPageFr from "./locales/fr/faq-page.json";
import type { Locale } from "@/lib/i18n";

// Un solo catálogo (`faq-page.json`, 6 temas) alimenta la página `/faq` Y el
// acordeón de la home: la home (`faq.json`) solo declara QUÉ preguntas del
// catálogo muestra (`featured`, por `id` estable) más su propio copy de
// sección. Así nunca hay dos redacciones de la misma respuesta ni un idioma
// con preguntas distintas a otro — el `id` es la identidad de la pregunta
// en los tres locales, y también el ancla `#id` de los enlaces directos.

const homeByLocale = { es: faqDataEs, en: faqDataEn, fr: faqDataFr };
const pageByLocale = { es: faqPageEs, en: faqPageEn, fr: faqPageFr };

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
}

export interface FaqPageCopy {
  badge: string;
  title: string;
  description: string;
  breadcrumbHome: string;
  breadcrumbAria: string;
  countLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  clearSearch: string;
  resultsOne: string;
  resultsMany: string;
  noResultsTitle: string;
  noResultsBody: string;
  topicsLabel: string;
  topicsAria: string;
  copyLink: string;
  linkCopied: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface FaqPageContent {
  meta: { title: string; description: string };
  page: FaqPageCopy;
  categories: FaqCategory[];
  /** Todas las preguntas del catálogo en orden de lectura. */
  items: FaqItem[];
}

export function getFaqPageContent(locale: Locale): FaqPageContent {
  const data = pageByLocale[locale];
  return {
    meta: data.meta,
    page: data.page,
    categories: data.categories,
    items: data.categories.flatMap((category) => category.items),
  };
}

/** Copy y preguntas destacadas de la sección FAQ de la home (subconjunto del catálogo por `id`). */
export function getFaqContent(locale: Locale) {
  const home = homeByLocale[locale];
  const all = getFaqPageContent(locale).items;
  const byId = new Map(all.map((item) => [item.id, item]));
  const items = home.featured
    .map((id) => byId.get(id))
    .filter((item): item is FaqItem => item !== undefined);

  return {
    badge: home.badge,
    title: home.title,
    description: home.description,
    viewAll: home.viewAll,
    moreQuestions: home.moreQuestions,
    totalCount: all.length,
    items,
  };
}
