import type { Metadata } from "next";
import { PortfolioCasePage } from "@/components/portfolio/PortfolioCasePage";
import { buildPortfolioCaseMetadata } from "@/lib/portfolioMetadata";
import { getPublishedPortfolioSlugs } from "@/lib/queries/portfolio";

// Mismo fallback que el índice — la revalidación real bajo demanda ocurre al
// cambiar el estado de publicación de un caso.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedPortfolioSlugs();
  return slugs.map((slug) => ({ slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildPortfolioCaseMetadata("en", slug);
}

export default async function ProjectPageEn({ params }: PageProps) {
  const { slug } = await params;
  return <PortfolioCasePage locale="en" slug={slug} />;
}
