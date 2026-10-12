import { getNavContent } from "@/content/nav";
import type { Service } from "@/content/services";
import { getServiceDetails } from "@/content/serviceDetails";
import { siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { stripInlineLinks } from "@/lib/inlineLinks";
import { SERVICE_AREAS, organizationRef, serializeJsonLd, serviceNodeId, websiteRef } from "@/lib/jsonLd";

/**
 * Un solo `@graph` por página de servicio: WebPage, Service (con `@id` estable, el mismo que cita
 * `makesOffer` de la organización), BreadcrumbList y, si hay preguntas, FAQPage. La organización y el
 * sitio se referencian por `@id` (definidos en el layout raíz), no se redefinen.
 */
export function ServiceJsonLd({ service, locale }: { service: Service; locale: Locale }) {
  const url = `${siteUrl}${servicePath(locale, service.slug)}`;
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const homeUrl = homePath === "/" ? siteUrl : `${siteUrl}${homePath}`;
  const serviceId = serviceNodeId(locale, service.slug);
  const breadcrumbId = `${url}#breadcrumb`;

  const details = getServiceDetails(service.slug, locale);

  const graph = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: service.title,
      inLanguage: locale,
      isPartOf: websiteRef(),
      breadcrumb: { "@id": breadcrumbId },
      mainEntity: { "@id": serviceId },
    },
    {
      "@type": "Service",
      "@id": serviceId,
      name: service.title,
      description: service.description,
      serviceType: service.title,
      provider: organizationRef(),
      areaServed: [...SERVICE_AREAS],
      mainEntityOfPage: { "@id": url },
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: navData.inicio, item: homeUrl },
        { "@type": "ListItem", position: 2, name: navData.servicios, item: `${siteUrl}${servicesIndexPath(locale)}` },
        { "@type": "ListItem", position: 3, name: service.title, item: url },
      ],
    },
    ...(details?.faqs.length
      ? [
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            inLanguage: locale,
            mainEntity: details.faqs.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
            })),
          },
        ]
      : []),
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  );
}
