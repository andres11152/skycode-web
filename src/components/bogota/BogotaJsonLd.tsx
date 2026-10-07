import { getBogotaContent } from "@/content/bogota";
import { stripInlineLinks } from "@/lib/inlineLinks";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { contactEmail, contactPhone, ogImageUrl, siteName, siteUrl, socials } from "@/lib/site";

// Centro de Bogotá. NO hay dirección de calle ni código postal publicados:
// no se inventan — solo ciudad, región, país y coordenadas aproximadas.
const BOGOTA_GEO = { latitude: 4.711, longitude: -74.0721 };

function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Se escapa '<' para evitar el cierre prematuro del <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/**
 * JSON-LD de `/desarrollo-software-bogota`: `ProfessionalService` (con el
 * mismo `@id` que la Organization del layout, para que sea UNA entidad con
 * ubicación local), `BreadcrumbList` y `FAQPage`. Las preguntas con marcador
 * `{{TODO}}` ya vienen filtradas por `getBogotaContent()` — nunca se emiten
 * respuestas pendientes en el esquema.
 */
export function BogotaJsonLd() {
  const content = getBogotaContent();
  const url = `${siteUrl}${bogotaPagePath}`;

  const service = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    image: ogImageUrl,
    description: content.meta.description,
    email: contactEmail,
    telephone: contactPhone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bogotá",
      addressRegion: "Bogotá D.C.",
      addressCountry: "CO",
    },
    geo: { "@type": "GeoCoordinates", ...BOGOTA_GEO },
    areaServed: { "@type": "Country", name: "Colombia" },
    sameAs: [socials.facebook, socials.instagram],
    mainEntityOfPage: url,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: content.services.heading,
      itemListElement: content.services.items.map((item) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: item.anchor,
          url: `${siteUrl}/servicios/${item.slug}`,
        },
      })),
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: content.breadcrumb.home, item: siteUrl },
      { "@type": "ListItem", position: 2, name: content.breadcrumb.current, item: url },
    ],
  };

  const faq =
    content.faq.items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          url,
          inLanguage: "es",
          mainEntity: content.faq.items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
          })),
        }
      : null;

  return (
    <>
      <JsonLdScript data={service} />
      <JsonLdScript data={breadcrumb} />
      {faq && <JsonLdScript data={faq} />}
    </>
  );
}
