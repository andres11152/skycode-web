"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getProcessContent } from "@/content/process";
import { defaultLocale, type Locale } from "@/lib/i18n";

export function Process({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const processData = getProcessContent(locale);

  return (
    <section aria-label={processData.sectionAria} className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-xl">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {processData.title}
          </h2>
          <p className="mt-3 text-foreground/80">{processData.description}</p>
        </div>

        <motion.ol
          variants={staggerContainer(reduced, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
        >
          {processData.steps.map((step, index) => (
            <motion.li key={step.title} variants={fadeUp(reduced)} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-sm font-bold text-background">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {index < processData.steps.length - 1 && (
                  <div aria-hidden="true" className="hidden h-px flex-1 bg-foreground/10 lg:block" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
