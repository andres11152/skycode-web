"use client";

import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { ChatCircle, CheckCircle } from "@phosphor-icons/react";
import { getContactContent } from "@/content/contact";
import { getUiContent } from "@/content/ui";
import { whatsappHref } from "@/lib/site";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { fadeUp } from "@/lib/animations";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { Button } from "@/components/ui/Button";
import { portfolioIndexPath } from "@/lib/portfolioPaths";

/**
 * Página de destino tras un envío exitoso del formulario de contacto —
 * reemplaza el modal in-place que había antes (ver Contact.tsx) porque una
 * URL propia es lo que necesitan las plataformas de ads (Google/Meta/etc.)
 * para medir conversiones por "visita a esta página", sin depender de un
 * snippet de evento distinto por plataforma. Reutiliza el mismo copy de
 * `successModal` en content/locales/{locale}/contact.json — no duplica texto.
 */
export function ThankYouView({ locale = defaultLocale }: { locale?: Locale }) {
  const contactData = getContactContent(locale);
  const uiData = getUiContent(locale);
  const reduced = useReducedMotion();
  const { successModal } = contactData;

  return (
    <>
      <GoogleAdsTag />
      <section className="flex min-h-[70vh] items-center px-6 py-20">
        <motion.div
          variants={fadeUp(reduced ?? false)}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-lg text-left"
        >
          <CheckCircle size={32} aria-hidden="true" className="text-foreground" />

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {successModal.title}
          </h1>
          <p className="mt-3 leading-relaxed text-foreground/80">{successModal.body}</p>

          <h2 className="mt-10 font-mono text-xs uppercase tracking-wide text-foreground/70">{successModal.stepsTitle}</h2>
          <ol className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
            {successModal.steps.map((step, index) => (
              <li key={step} className="flex gap-4 py-4 text-sm leading-relaxed">
                <span className="font-mono text-foreground/70">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-foreground/80">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={portfolioIndexPath(locale)} variant="accent" size="lg">
              {successModal.portfolioCta}
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground/20 px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:border-foreground/35 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChatCircle size={18} aria-hidden="true" />
              {successModal.whatsappCta}
            </a>
          </div>

          <Link
            href={localeHomePath(locale)}
            className="mt-6 inline-flex min-h-11 items-center text-sm text-foreground/70 underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {uiData.backToHome}
          </Link>
        </motion.div>
      </section>
    </>
  );
}
