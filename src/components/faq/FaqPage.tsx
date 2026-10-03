import { FaqPageView } from "@/components/faq/FaqPageView";
import { FaqPageJsonLd } from "@/components/faq/FaqPageJsonLd";
import { getFaqPageContent } from "@/content/faq";
import type { Locale } from "@/lib/i18n";

/** Server Component compartido por `/preguntas-frecuentes`, `/en/faq` y `/fr/faq`. */
export function FaqPage({ locale }: { locale: Locale }) {
  const { page, categories, items } = getFaqPageContent(locale);
  return (
    <>
      <FaqPageJsonLd locale={locale} />
      <FaqPageView locale={locale} copy={page} categories={categories} total={items.length} />
    </>
  );
}
