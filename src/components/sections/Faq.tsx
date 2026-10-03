"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { getFaqContent } from "@/content/faq";
import { faqPath } from "@/lib/faqPaths";
import { defaultLocale, t, type Locale } from "@/lib/i18n";

export function Faq({ locale = defaultLocale }: { locale?: Locale }) {
  const faqData = getFaqContent(locale);
  const faqHref = faqPath(locale);

  return (
    <section id="faq" className="scroll-mt-24 bg-foreground/[0.01] px-6 py-20 sm:py-24 lg:py-28 border-t border-foreground/5">
      {/* max-w-6xl: mismo ancho de contenedor que el resto de secciones. El
          acordeón en sí se queda en `max-w-3xl` (las preguntas no deben
          estirarse a todo el ancho) pero centrado dentro de ese contenedor
          — a pedido explícito. El acordeón es el mismo componente (y el mismo
          catálogo, por `id`) que usa la página /preguntas-frecuentes. */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <SectionEyebrow className="mb-3">{faqData.badge}</SectionEyebrow>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{faqData.title}</h2>
            <p className="mt-3 text-foreground/80">{faqData.description}</p>
          </div>

          <Button href={faqHref} variant="secondary" size="sm" className="shrink-0">
            {faqData.viewAll}
          </Button>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col border-t border-foreground/10">
          {faqData.items.map((item) => (
            <FaqAccordionItem key={item.id} item={item} />
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <Link
            href={faqHref}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="underline decoration-foreground/30 underline-offset-4 transition-colors group-hover:decoration-foreground">
              {t(faqData.moreQuestions, { count: String(faqData.totalCount) })}
            </span>
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
