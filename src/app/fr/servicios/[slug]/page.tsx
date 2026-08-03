import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServicesContent, getServiceBySlug } from "@/content/services";
import { ServiceView } from "@/components/services/ServiceView";
import { ServiceJsonLd } from "@/components/services/ServiceJsonLd";
import { buildServiceMetadata } from "@/lib/serviceMetadata";

export function generateStaticParams() {
  return getServicesContent("fr").services.map((service) => ({ slug: service.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildServiceMetadata("fr", slug);
}

export default async function ServicePageFr({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug, "fr");

  if (!service) {
    notFound();
  }

  return (
    <>
      <ServiceJsonLd service={service} locale="fr" />
      <ServiceView slug={slug} locale="fr" />
    </>
  );
}
