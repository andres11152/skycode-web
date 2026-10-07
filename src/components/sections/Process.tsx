"use client";

import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { getProcessContent } from "@/content/process";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { EsBadge } from "@/components/ui/EsBadge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

export function Process({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const processData = getProcessContent(locale);

  return (
    <section aria-label={processData.sectionAria} id="proceso" className="scroll-mt-24 px-6 py-20 sm:py-24 lg:py-28 bg-foreground/[0.01]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow className="mb-3">{processData.badge}</SectionEyebrow>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {processData.title}
          </h2>
          <p className="mt-3 text-base text-foreground/80">{processData.description}</p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {processData.steps.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: reduced ? 0 : index * 0.1 }}
              className="h-full"
            >
              <SpotlightCard className="h-full rounded-xl border border-foreground/10 bg-background/60 p-6 backdrop-blur-md transition-all hover:border-accent/30 hover:shadow-[0_10px_30px_rgba(0,137,205,0.08)]">
                <div className="flex flex-col justify-between h-full gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-strong text-white font-mono text-sm font-bold shadow-md shadow-accent/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {index < processData.steps.length - 1 && (
                        <span className="text-xs font-mono font-bold text-accent/40 hidden lg:inline">→</span>
                      )}
                    </div>

                    <h3 className="text-base font-bold tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/80">{step.description}</p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.li>
          ))}
        </ol>

        {/* Enlace de texto a la página local de Bogotá (solo en español: en /en y /fr lleva la insignia ES). */}
        <p className="mt-10 max-w-2xl text-base leading-relaxed text-foreground/80">
          {processData.localPage.text}{" "}
          <Link
            href={bogotaPagePath}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {processData.localPage.linkLabel}
            {locale !== "es" && <EsBadge />}
          </Link>
        </p>
      </div>
    </section>
  );
}
