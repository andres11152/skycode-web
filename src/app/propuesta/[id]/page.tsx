import { notFound } from "next/navigation";
import { z } from "zod";
import type { Metadata } from "next";
import { query } from "@/lib/db";
import { getProposalById } from "@/lib/queries/proposals";
import { ProposalView } from "@/components/proposals/ProposalView";

export const metadata: Metadata = {
  title: "Propuesta Comercial | SKYCODE Agency",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: PageProps) {
  const { id } = await params;

  if (!z.uuid().safeParse(id).success) notFound();

  const proposal = await getProposalById(id);
  if (!proposal) notFound();

  // Marca la primera vista, en el propio render del server — sin ida y
  // vuelta al cliente para algo que ya sabemos al servir la página.
  if (!proposal.viewed_at) {
    await query(`UPDATE proposals SET viewed_at = now() WHERE id = $1 AND viewed_at IS NULL;`, [id]);
  }

  return <ProposalView proposal={proposal} />;
}
