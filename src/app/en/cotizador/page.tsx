import type { Metadata } from "next";
import { CotizadorPageView } from "@/components/sections/CotizadorPageView";
import { buildEstimatorMetadata } from "@/lib/estimatorMetadata";

export const metadata: Metadata = buildEstimatorMetadata("en");

export default function CotizadorPageEn() {
  return <CotizadorPageView locale="en" />;
}
