import type { Metadata } from "next";
import { TeamView } from "@/components/team/TeamView";
import { buildTeamMetadata } from "@/lib/teamMetadata";

export const metadata: Metadata = buildTeamMetadata("en");

export default function TeamPageEn() {
  return <TeamView locale="en" />;
}
