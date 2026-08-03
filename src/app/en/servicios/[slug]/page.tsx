import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServicesContent, getServiceBySlug } from "@/content/services";
import { ServiceView } from "@/components/services/ServiceView";
import { ServiceJsonLd } from "@/components/services/ServiceJsonLd";
import { buildServiceMetadata } from "@/lib/serviceMetadata";

export function generateStaticParams() {
  return getServicesContent("en").services.map((service) => ({ slug: service.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildServiceMetadata("en", slug);
}

export default async function ServicePageEn({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug, "en");

  if (!service) {
    notFound();
  }

  return (
    <>
      <ServiceJsonLd service={service} locale="en" />
      <ServiceView slug={slug} locale="en" />
    </>
  );
}
