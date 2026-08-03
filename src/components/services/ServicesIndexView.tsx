"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getServicesContent } from "@/content/services";
import { getServicePageContent } from "@/content/servicePage";
import { getNavContent } from "@/content/nav";
import { localeHomePath, type Locale } from "@/lib/i18n";

export function ServicesIndexView({ locale }: { locale: Locale }) {
  const reduced = Boolean(useReducedMotion());
  const { services, servicesSection } = getServicesContent(locale);
  const servicePageData = getServicePageContent(locale);
  const navData = getNavContent(locale);
  const homePath = localeHomePath(locale);
  const prefix = homePath === "/" ? "" : homePath;

  return (
    <main id="main-content" className="px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={staggerContainer(reduced)}
          initial="hidden"
          animate="visible"
          className="flex max-w-2xl flex-col items-start gap-4 text-left"
        >
          <motion.nav variants={fadeUp(reduced)} aria-label={servicePageData.breadcrumbAria}>
            <ol className="flex items-center gap-2 text-sm text-foreground/60">
              <li>
                <Link
                  href={homePath}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {navData.inicio}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground">{navData.servicios}</li>
            </ol>
          </motion.nav>

          <motion.h1
            variants={fadeUp(reduced)}
            className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl"
          >
            {servicesSection.title}
          </motion.h1>
          <motion.p variants={fadeUp(reduced)} className="max-w-2xl text-lg text-foreground/80">
            {servicesSection.description}
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer(reduced, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service) => (
            <motion.div key={service.slug} variants={fadeUp(reduced)}>
              <SpotlightCard className="h-full">
                <Link
                  href={`${prefix}/servicios/${service.slug}`}
                  className="group flex h-full flex-col justify-between rounded-xl border border-foreground/10 bg-background p-6 sm:p-8 outline-none transition-all duration-300 hover:border-accent/30 hover:shadow-[0_12px_40px_rgba(0,137,205,0.04)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div>
                    <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br from-foreground/5 to-foreground/[0.01] text-foreground/60 transition-all duration-300 group-hover:border-accent/30 group-hover:from-accent/15 group-hover:to-accent/5 group-hover:text-accent">
                      <service.coverIcon size={22} strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-accent">
                      {service.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{service.description}</p>
                  </div>
                  <ul className="mt-6 flex flex-col gap-2 border-t border-foreground/5 pt-5">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/70">
                        <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
