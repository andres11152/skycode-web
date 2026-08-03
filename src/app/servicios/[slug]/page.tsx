import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getServiceBySlug } from "@/content/services";
import { ServiceView } from "@/components/services/ServiceView";
import { ServiceJsonLd } from "@/components/services/ServiceJsonLd";
import { buildServiceMetadata } from "@/lib/serviceMetadata";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildServiceMetadata("es", slug);
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug, "es");

  if (!service) {
    notFound();
  }

  return (
    <>
      <ServiceJsonLd service={service} locale="es" />
      <ServiceView slug={slug} locale="es" />
    </>
  );
}
