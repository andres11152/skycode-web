import { getFaqContent } from "@/content/faq";
import type { Locale } from "@/lib/i18n";

/** Mismo bloque de FAQ real en los tres locales de la home — se reusa aquí en vez
 * de repetir el JSON.stringify en cada page.tsx. */
export function FaqJsonLd({ locale }: { locale: Locale }) {
  const faqData = getFaqContent(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
