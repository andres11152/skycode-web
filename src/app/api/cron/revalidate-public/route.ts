import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { blogIndexPath } from "@/lib/blogPaths";
import { estimatorPath } from "@/lib/estimatorMetadata";
import { faqPath } from "@/lib/faqPaths";
import { locales } from "@/lib/i18n";
import { portfolioIndexPath } from "@/lib/portfolioPaths";
import { servicesIndexPath } from "@/lib/serviceMetadata";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { teamPath } from "@/lib/teamMetadata";

/**
 * POST /api/cron/revalidate-public - Invalida la caché (ISR) de TODAS las
 * páginas públicas que leen de Postgres: portafolio, blog, servicios, equipo,
 * home, sitemap, feeds y llms.txt. Mismo secreto compartido (`x-cron-secret`)
 * que el resto de crons.
 *
 * Existe para los scripts de datos (`db:seo-*`, `db:archive-portfolio-case`):
 * editan filas directamente en la base y, a diferencia del dashboard, no pasan
 * por un Route Handler que llame a `revalidatePath`, así que un caso archivado
 * o un texto nuevo tardaba hasta una hora (el `revalidate` de respaldo) en
 * verse. Los scripts lo llaman al terminar (ver scripts/lib/revalidatePublic.mjs).
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  for (const locale of locales) {
    revalidatePath(portfolioIndexPath(locale));
    revalidatePath(blogIndexPath(locale));
    revalidatePath(servicesIndexPath(locale));
    revalidatePath(teamPath(locale));
    revalidatePath(faqPath(locale));
    revalidatePath(estimatorPath(locale));
    revalidatePath(locale === "es" ? "/" : `/${locale}`);
    revalidatePath(locale === "es" ? "/feed.xml" : `/${locale}/feed.xml`);
  }
  // Rutas dinámicas: un patrón con "page" invalida todas sus páginas ya generadas.
  for (const pattern of [
    "/portafolio/[slug]",
    "/en/portfolio/[slug]",
    "/fr/portfolio/[slug]",
    "/blog/[slug]",
    "/en/blog/[slug]",
    "/fr/blog/[slug]",
    "/servicios/[slug]",
    "/en/servicios/[slug]",
    "/fr/servicios/[slug]",
  ]) {
    revalidatePath(pattern, "page");
  }
  revalidatePath(bogotaPagePath);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");

  return NextResponse.json({ success: true, revalidatedAt: new Date().toISOString() });
}
