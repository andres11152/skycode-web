import type { Metadata } from "next";
import { CotizadorPageView } from "@/components/sections/CotizadorPageView";
import { buildEstimatorMetadata } from "@/lib/estimatorMetadata";

export const metadata: Metadata = buildEstimatorMetadata("es");

export default function CotizadorPage() {
  return <CotizadorPageView locale="es" />;
}
