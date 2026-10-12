import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { LANDING_VARIANT_IDS, getLandingMetadata, isLandingVariantId } from "@/content/landing";

export const revalidate = 3600;

// La variante general vive en /landing; aquí solo las demás. Cualquier otro segmento es 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_VARIANT_IDS.filter((id) => id !== "general").map((variante) => ({ variante }));
}

type PageProps = { params: Promise<{ variante: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { variante } = await params;
  if (!isLandingVariantId(variante) || variante === "general") notFound();
  return getLandingMetadata(variante);
}

export default async function LandingVariantRoute({ params }: PageProps) {
  const { variante } = await params;
  if (!isLandingVariantId(variante) || variante === "general") notFound();
  return <LandingPage variant={variante} />;
}
