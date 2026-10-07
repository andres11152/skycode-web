import type { Metadata } from "next";
import { TeamView } from "@/components/team/TeamView";
import { TeamJsonLd } from "@/components/team/TeamJsonLd";
import { buildTeamMetadata } from "@/lib/teamMetadata";
import { getPublishedTeamProfiles } from "@/lib/queries/teamProfiles";

// Las personas viven en Postgres desde la Fase 5 de perfiles. Respaldo de
// una hora por si la revalidación bajo demanda (lib/revalidateTeam.ts, al
// editar un perfil desde el dashboard) no llega a dispararse.
export const revalidate = 3600;

export const metadata: Metadata = buildTeamMetadata("es");

export default async function EquipoPage() {
  const members = await getPublishedTeamProfiles("es");
  return (
    <>
      <TeamJsonLd members={members} locale="es" />
      <TeamView locale="es" members={members} />
    </>
  );
}
