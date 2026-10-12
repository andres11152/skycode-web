import type { Metadata } from "next";
import { AuthorPage } from "@/components/team/AuthorPage";
import { buildAuthorMetadata } from "@/lib/authorMetadata";
import { getPublishedTeamSlugs } from "@/lib/queries/teamProfiles";

// Las personas viven en Postgres: respaldo de 1 h + revalidación bajo demanda al editar un perfil
// (lib/revalidateTeam.ts). Una persona nueva se genera en su primer request (`dynamicParams`).
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedTeamSlugs()).map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildAuthorMetadata("en", slug);
}

export default async function AuthorPageEn({ params }: PageProps) {
  const { slug } = await params;
  return <AuthorPage locale="en" slug={slug} />;
}
