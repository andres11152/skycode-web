import { localeHomePath, type Locale } from "@/lib/i18n";

// Funciones puras de rutas, sin imports de contenido — mismo criterio que
// `lib/blogPaths.ts`: las usan componentes cliente (Navbar, Footer) sin
// arrastrar nada de servidor al bundle del navegador.

/**
 * Ruta de la página de preguntas frecuentes. A diferencia del resto de
 * secciones (mismo segmento en los tres idiomas), el slug se traduce:
 * `/preguntas-frecuentes` es la búsqueda real en español y lleva la
 * palabra clave en la URL; `/en/faq` y `/fr/faq` son lo que se busca en
 * inglés y francés ("faq" es la forma estándar en ambos). El hreflang
 * cruzado (ver `lib/faqMetadata.ts` y el sitemap) mantiene la relación.
 */
export function faqPath(locale: Locale): string {
  const homePath = localeHomePath(locale);
  return homePath === "/" ? "/preguntas-frecuentes" : `${homePath}/faq`;
}
