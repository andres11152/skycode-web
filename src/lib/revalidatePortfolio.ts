import { revalidatePath } from "next/cache";

/**
 * Se llama después de publicar/despublicar/archivar un caso del portafolio
 * — mismo criterio que `lib/revalidateArticle.ts` para el blog. Revalida
 * el índice, el detalle del caso, el sitemap y la Home (donde vive la
 * sección `Portfolio` con el caso destacado) y las páginas de servicios
 * (índice y detalle muestran casos reales, ver `lib/serviceCases.ts`) — las
 * superficies públicas que leen de `portfolio_projects`.
 * Solo se dispara desde el Route Handler de estado, no desde el módulo de
 * queries (`next/cache` no funciona fuera de un Route Handler/Server
 * Action).
 */
export function revalidatePortfolioPaths(slug: string): void {
  revalidatePath("/portafolio");
  revalidatePath(`/portafolio/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/fr");
  for (const prefix of ["", "/en", "/fr"]) {
    revalidatePath(`${prefix}/servicios`);
    revalidatePath(`${prefix}/servicios/[slug]`, "page");
  }
}
