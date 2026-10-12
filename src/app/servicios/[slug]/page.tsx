import type { Metadata } from "next";
import { ServiceDetailPage, buildServicePageMetadata, serviceStaticParams } from "@/components/services/ServicePage";

export const revalidate = 3600;

export function generateStaticParams() {
  return serviceStaticParams("es");
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildServicePageMetadata("es", slug);
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  return <ServiceDetailPage locale="es" slug={slug} />;
}
