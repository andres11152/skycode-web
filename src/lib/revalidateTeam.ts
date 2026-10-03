import { revalidatePath } from "next/cache";
import { teamPath } from "@/lib/teamMetadata";
import { blogIndexPath } from "@/lib/blogPaths";

/**
 * Se llama tras cualquier cambio en un perfil público del equipo — mismo
 * criterio que `revalidatePortfolio.ts`. Revalida `/equipo` en los tres
 * idiomas (la página es la misma lista de personas, solo cambia el texto).
 * También revalida el blog: cada artículo muestra la foto, el cargo y la
 * bio de su autor (`lib/blogData.ts`), así que un cambio de perfil no debe
 * esperar al respaldo de 1 h. Se dispara siempre, publicado o no el perfil: `revalidatePath` es barato,
 * y evita tener que razonar en cada ruta si el cambio era visible.
 */
export function revalidateTeamPaths(): void {
  revalidatePath(teamPath("es"));
  revalidatePath(teamPath("en"));
  revalidatePath(teamPath("fr"));
  for (const locale of ["es", "en", "fr"] as const) {
    revalidatePath(blogIndexPath(locale));
    revalidatePath(`${blogIndexPath(locale)}/[slug]`, "page");
  }
}
