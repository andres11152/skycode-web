import type { Locale } from "@/lib/i18n";

// Funciones puras de rutas, sin imports de contenido ni de DB — mismo criterio
// que `lib/blogPaths.ts`/`lib/faqPaths.ts`: las usan componentes cliente
// (Navbar, Footer, vistas del portafolio) sin arrastrar `pg` al navegador.

/**
 * Índice del portafolio. El español conserva su URL de siempre
 * (`/portafolio`, ya indexada y enlazada); en inglés y francés el slug se
 * traduce a `portfolio` — es la palabra que se busca en esos idiomas, igual
 * que `/preguntas-frecuentes` vs `/en/faq`. El hreflang cruzado las relaciona.
 */
export function portfolioIndexPath(locale: Locale): string {
  return locale === "es" ? "/portafolio" : `/${locale}/portfolio`;
}

/** Caso de estudio: mismo slug en los tres idiomas, solo cambia el prefijo del índice. */
export function portfolioCasePath(locale: Locale, slug: string): string {
  return `${portfolioIndexPath(locale)}/${slug}`;
}
