import { getNavContent } from "@/content/nav";
import type { Service } from "@/content/services";
import { siteName, siteUrl } from "@/lib/site";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { servicePath } from "@/lib/serviceMetadata";
import { stripInlineLinks } from "@/lib/inlineLinks";

export function ServiceJsonLd({ service, locale }: { service: Service; locale: Locale }) {
  const url = `${siteUrl}${servicePath(locale, service.slug)}`;
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const homeUrl = homePath === "/" ? siteUrl : `${siteUrl}${homePath}`;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    provider: { "@type": "Organization", name: siteName, url: siteUrl },
    areaServed: ["CO", "MX", "CL", "PE", "EC", "PA", "AR", "UY", "US", "FR"],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: navData.inicio, item: homeUrl },
      { "@type": "ListItem", position: 2, name: navData.servicios, item: `${homeUrl}/#servicios` },
      { "@type": "ListItem", position: 3, name: service.title, item: url },
    ],
  };

  const faqJsonLd = service.details?.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: service.details.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </>
  );
}
