import type { Metadata } from "next";
import { CotizadorPageView } from "@/components/sections/CotizadorPageView";
import { buildEstimatorMetadata } from "@/lib/estimatorMetadata";

export const metadata: Metadata = buildEstimatorMetadata("fr");

export default function CotizadorPageFr() {
  return <CotizadorPageView locale="fr" />;
}
