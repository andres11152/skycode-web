import { revalidatePath } from "next/cache";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { locales } from "@/lib/i18n";

/**
 * Se llama después de publicar/despublicar/archivar un caso del portafolio
 * — mismo criterio que `lib/revalidateArticle.ts` para el blog. Revalida
 * el índice y el detalle del caso en los tres idiomas, el sitemap y la Home (donde vive la
 * sección `Portfolio` con el caso destacado) y las páginas de servicios
 * (índice y detalle muestran casos reales, ver `lib/serviceCases.ts`) — las
 * superficies públicas que leen de `portfolio_projects`.
 * Solo se dispara desde el Route Handler de estado, no desde el módulo de
 * queries (`next/cache` no funciona fuera de un Route Handler/Server
 * Action).
 */
export function revalidatePortfolioPaths(slug: string): void {
  for (const locale of locales) {
    revalidatePath(portfolioIndexPath(locale));
    revalidatePath(portfolioCasePath(locale, slug));
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/fr");
  for (const prefix of ["", "/en", "/fr"]) {
    revalidatePath(`${prefix}/servicios`);
    revalidatePath(`${prefix}/servicios/[slug]`, "page");
  }
}
