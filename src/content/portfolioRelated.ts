import { getRelatedPostSlugsForService } from "@/content/relatedContent";

// Selección pura (sin DB ni React) de los artículos que se enlazan desde un
// caso de estudio. Parte de la tabla única blog <-> servicios
// (`relatedContent.ts`) para que caso, servicio y artículo nunca se
// contradigan.

/**
 * Hasta `max` slugs de artículos para los servicios aplicados en un caso.
 * Reparte por rondas entre los servicios (el primer artículo de cada
 * servicio antes que el segundo de ninguno): así un caso con servicios
 * distintos enlaza a temas distintos en vez de dos artículos del primero.
 * Sin duplicados.
 */
export function pickRelatedPostSlugs(serviceSlugs: string[], max = 2): string[] {
  const lists = serviceSlugs.map((slug) => getRelatedPostSlugsForService(slug));
  const picked: string[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let round = 0; round < longest && picked.length < max; round++) {
    for (const list of lists) {
      const slug = list[round];
      if (slug && !picked.includes(slug)) picked.push(slug);
      if (picked.length >= max) break;
    }
  }
  return picked;
}
