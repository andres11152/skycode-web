import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/content/services";
import { ServiceView } from "@/components/services/ServiceView";
import { ServiceJsonLd } from "@/components/services/ServiceJsonLd";
import { buildServiceMetadata } from "@/lib/serviceMetadata";
import { getServiceCaseProjects } from "@/lib/serviceCases";
import type { Locale } from "@/lib/i18n";
import { SERVICE_IDS, serviceIdFromSlug, serviceSlugFor } from "@/seo/slugs";

// Compartido por las tres rutas de detalle (`/servicios/[slug]`, `/en/services/[slug]`,
// `/fr/services/[slug]`). El segmento de la URL es el slug NATIVO del idioma; el `id` interno del
// servicio (su slug en español) es lo que usan el contenido, los casos y el enlazado. Un slug que no
// existe en ese idioma es un 404 (nunca metadata vacía, que heredaría la de la home). Cada
// `page.tsx` conserva su `revalidate`/`generateStaticParams` literales.

export function serviceStaticParams(locale: Locale): { slug: string }[] {
  return SERVICE_IDS.map((id) => ({ slug: serviceSlugFor(id, locale) }));
}

export function buildServicePageMetadata(locale: Locale, slug: string): Metadata {
  const id = serviceIdFromSlug(slug, locale);
  if (!id) notFound();
  return buildServiceMetadata(locale, id);
}

export async function ServiceDetailPage({ locale, slug }: { locale: Locale; slug: string }) {
  const id = serviceIdFromSlug(slug, locale);
  const service = id ? getServiceBySlug(id, locale) : undefined;
  if (!id || !service) notFound();

  const projects = await getServiceCaseProjects(id, locale);

  return (
    <>
      <ServiceJsonLd service={service} locale={locale} />
      <ServiceView slug={id} locale={locale} projects={projects} />
    </>
  );
}
