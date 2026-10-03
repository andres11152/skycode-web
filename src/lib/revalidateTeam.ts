import { revalidatePath } from "next/cache";
import { teamPath } from "@/lib/teamMetadata";

/**
 * Se llama tras cualquier cambio en un perfil público del equipo — mismo
 * criterio que `revalidatePortfolio.ts`. Revalida `/equipo` en los tres
 * idiomas (la página es la misma lista de personas, solo cambia el texto).
 * Se dispara siempre, publicado o no el perfil: `revalidatePath` es barato,
 * y evita tener que razonar en cada ruta si el cambio era visible.
 */
export function revalidateTeamPaths(): void {
  revalidatePath(teamPath("es"));
  revalidatePath(teamPath("en"));
  revalidatePath(teamPath("fr"));
}
