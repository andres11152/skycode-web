import { BogotaJsonLd } from "@/components/bogota/BogotaJsonLd";
import { BogotaView } from "@/components/bogota/BogotaView";
import { rawBogotaContent } from "@/content/bogota";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";

/**
 * Server Component de `/desarrollo-software-bogota` (solo español). Las
 * capturas de los casos salen de Postgres (igual que /portafolio); la consulta
 * ya relanza el error en producción para que ISR conserve la última versión
 * buena en vez de guardar una página sin capturas.
 */
export async function BogotaPage() {
  const wanted = new Set(rawBogotaContent.cases.items.map((item) => item.slug));
  const projects = (await getPublishedPortfolioProjects("es")).filter((project) => wanted.has(project.slug));
  return (
    <>
      <BogotaJsonLd />
      <BogotaView projects={projects} />
    </>
  );
}
