import { getFaqPageContent } from "@/content/faq";
import { stripInlineLinks } from "@/lib/inlineLinks";
import { faqPath } from "@/lib/faqPaths";
import { localeHomePath, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

/**
 * JSON-LD de la página de preguntas frecuentes: `FAQPage` con TODO el
 * catálogo (el texto sin la sintaxis de enlace) y `BreadcrumbList`. Nota
 * honesta: Google limitó los resultados enriquecidos de FAQ a sitios
 * gubernamentales y de salud (2023), así que aquí no aporta estrellas ni
 * desplegables en el buscador; se mantiene porque describe el contenido de
 * forma semántica para buscadores y motores de respuesta con IA, y no cuesta
 * nada. El SEO real de esta página es el contenido en el HTML, los h2/h3 y
 * el enlazado interno hacia los servicios.
 */
export function FaqPageJsonLd({ locale }: { locale: Locale }) {
  const { items, page } = getFaqPageContent(locale);
  const url = `${siteUrl}${faqPath(locale)}`;
  const homePath = localeHomePath(locale);
  const homeUrl = homePath === "/" ? siteUrl : `${siteUrl}${homePath}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      "@id": `${url}#${item.id}`,
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: stripInlineLinks(item.answer) },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: page.breadcrumbHome, item: homeUrl },
      { "@type": "ListItem", position: 2, name: page.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
