import type { Metadata } from "next";
import { PortfolioIndexPage } from "@/components/portfolio/PortfolioIndexPage";
import { buildPortfolioIndexMetadata } from "@/lib/portfolioMetadata";

// Fallback de una hora por si la revalidación bajo demanda (lib/revalidatePortfolio.ts,
// al cambiar el estado de un caso desde el dashboard) no llega a dispararse.
export const revalidate = 3600;

export const metadata: Metadata = buildPortfolioIndexMetadata("fr");

export default function PortfolioPageFr() {
  return <PortfolioIndexPage locale="fr" />;
}
