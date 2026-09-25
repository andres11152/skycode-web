"use client";

import { useState } from "react";
import { m as motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getFaqContent } from "@/content/faq";
import { defaultLocale, type Locale } from "@/lib/i18n";

export function Faq({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const faqData = getFaqContent(locale);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faq" className="scroll-mt-24 bg-foreground/[0.01] px-6 py-20 sm:py-24 lg:py-28 border-t border-foreground/5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 max-w-xl">
          <SectionEyebrow className="mb-3">{faqData.badge}</SectionEyebrow>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {faqData.title}
          </h2>
          <p className="mt-3 text-foreground/80">
            {faqData.description}
          </p>
        </div>

        <div className="flex flex-col border-t border-foreground/10">
          {faqData.items.map((item, index) => {
            const isOpen = activeIndex === index;
            return (
              <div
                key={index}
                className="border-b border-foreground/10"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between py-6 text-left outline-none group focus-visible:text-accent"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="text-base font-semibold text-foreground transition-colors duration-200 group-hover:text-accent-strong sm:text-lg">
                    {item.question}
                  </span>
                  <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground/60 transition-all duration-300 group-hover:bg-accent-strong group-hover:text-white group-hover:scale-110 active:scale-95 group-hover:shadow-[0_0_15px_rgba(0,137,205,0.25)]">
                    <motion.span
                      animate={{ rotate: isOpen ? 135 : 0, scale: isOpen ? 1.05 : 1 }}
                      transition={{ duration: reduced ? 0.01 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center justify-center"
                    >
                      <Plus size={16} weight="bold" />
                    </motion.span>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0, y: -6 }}
                      animate={{ height: "auto", opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -4 }}
                      transition={{ duration: reduced ? 0.01 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 pr-12 text-sm text-foreground/85 leading-relaxed sm:text-base">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
