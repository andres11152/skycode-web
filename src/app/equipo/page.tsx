import type { Metadata } from "next";
import { TeamView } from "@/components/team/TeamView";
import { buildTeamMetadata } from "@/lib/teamMetadata";

export const metadata: Metadata = buildTeamMetadata("es");

export default function EquipoPage() {
  return <TeamView locale="es" />;
}
