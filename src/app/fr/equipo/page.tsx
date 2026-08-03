import type { Metadata } from "next";
import { TeamView } from "@/components/team/TeamView";
import { buildTeamMetadata } from "@/lib/teamMetadata";

export const metadata: Metadata = buildTeamMetadata("fr");

export default function TeamPageFr() {
  return <TeamView locale="fr" />;
}
