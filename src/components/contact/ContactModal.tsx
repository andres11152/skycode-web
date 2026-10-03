"use client";

import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { GridPattern } from "@/components/ui/GridPattern";
import { getContactModalContent } from "@/content/contactModal";
import { contactEmail, contactPhone, whatsappHref } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { ContactForm, type ContactFormPrefill } from "./ContactForm";

const ringOnDark = "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground";

export default function ContactModal({
  open,
  onClose,
  locale,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  prefill?: ContactFormPrefill;
}) {
  const t = getContactModalContent(locale);

  const aside = (
    <aside className="relative hidden w-[40%] shrink-0 flex-col justify-between gap-10 overflow-hidden bg-foreground p-10 text-background lg:flex">
      <GridPattern aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 stroke-background/[0.08] opacity-60 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/[0.12] blur-[90px]" />
      <div className="relative">
        <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-background/80 uppercase">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t.asideEyebrow}
        </p>
        <p className="mt-5 text-2xl leading-snug font-bold tracking-tight text-balance">{t.asideTitle}</p>
        <h3 className="mt-10 font-mono text-xs tracking-wide text-background/80 uppercase">{t.stepsHeading}</h3>
        <ol className="mt-4 flex flex-col gap-3.5">
          {t.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-background/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-background/20 font-mono text-xs text-background">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="relative">
        <ul className="flex flex-col gap-2">
          {t.guarantees.map((g) => (
            <li key={g} className="flex items-center gap-2 text-sm text-background/80">
              <Check size={14} weight="bold" className="shrink-0 text-accent" aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-background/15 pt-5">
          <p className="text-xs text-background/80">{t.directHeading}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm font-medium">
            <a href={`mailto:${contactEmail}`} className={`inline-flex min-h-11 items-center rounded-full hover:underline ${ringOnDark}`}>
              {contactEmail}
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1 rounded-full hover:underline ${ringOnDark}`}>
              {t.whatsappLabel} {contactPhone}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
      description={t.description}
      descriptionClassName="lg:sr-only"
      closeLabel={t.closeLabel}
      size="xl"
      aside={aside}
    >
      <ContactForm locale={locale} variant="modal" prefill={prefill} />
    </Modal>
  );
}
