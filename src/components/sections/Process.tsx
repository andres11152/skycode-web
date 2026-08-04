"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getProcessContent } from "@/content/process";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export function Process({ locale = defaultLocale }: { locale?: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const processData = getProcessContent(locale);

  return (
    <section aria-label={processData.sectionAria} id="proceso" className="px-6 py-24 bg-foreground/[0.01]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent mb-4 uppercase tracking-wider font-mono">
            <span>Metodología de Alto Rendimiento</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {processData.title}
          </h2>
          <p className="mt-3 text-base text-foreground/70">{processData.description}</p>
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
              <SpotlightCard className="h-full rounded-2xl border border-foreground/10 bg-background/60 p-6 backdrop-blur-md transition-all hover:border-accent/30 hover:shadow-[0_10px_30px_rgba(0,137,205,0.08)]">
                <div className="flex flex-col justify-between h-full gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white font-mono text-sm font-bold shadow-md shadow-accent/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {index < processData.steps.length - 1 && (
                        <span className="text-xs font-mono font-bold text-accent/40 hidden lg:inline">→</span>
                      )}
                    </div>

                    <h3 className="text-base font-bold tracking-tight text-foreground">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/70">{step.description}</p>
                  </div>

                  <div className="border-t border-foreground/5 pt-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
                      Paso {index + 1} de 4
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
