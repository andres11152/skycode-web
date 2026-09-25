"use client";

import Link from "next/link";
import Script from "next/script";
import { m as motion, useReducedMotion } from "framer-motion";
import { ChatCircle, CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import { getContactContent } from "@/content/contact";
import { getUiContent } from "@/content/ui";
import { whatsappHref } from "@/lib/site";
import { defaultLocale, localeHomePath, type Locale } from "@/lib/i18n";
import { fadeUp } from "@/lib/animations";

const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

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

  return (
    <>
      {googleAdsId && (
        // Movido aquí desde app/layout.tsx: antes se cargaba en TODAS las
        // páginas del sitio (148KB de JS, gran parte sin usar fuera de esta
        // página), inflando el trabajo del hilo principal justo cuando un
        // usuario real hace su primer tap — contribuía al INP alto medido
        // por CrUX en la home. La conversión de Google Ads "Envío de
        // formulario para clientes potenciales" es de tipo "Carga de
        // página" exclusivamente sobre /gracias, así que no hace falta en
        // ninguna otra ruta. `afterInteractive` (no `lazyOnload`) se
        // mantiene: esta página tiene poco dwell time, el tag necesita
        // correr 'config' apenas monta, sin esperar a que el navegador
        // quede idle.
        <>
          <Script
            id="google-ads-tag"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          />
          <Script id="google-ads-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
              console.log('[GAds] gtag config ejecutado en', window.location.pathname, '- revisa la pestaña Network filtrando por "googleads" o "pagead" para confirmar el disparo de la conversión.');
            `}
          </Script>
        </>
      )}
      <section className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <motion.div
        variants={fadeUp(reduced ?? false)}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-md text-center"
      >
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <CheckCircle size={42} className="stroke-[2.2]" />
          <div className="absolute -top-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-md">
            <ShieldCheck size={16} />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {contactData.successModal.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{contactData.successModal.body}</p>

        <div className="mt-6 space-y-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-left text-xs text-foreground/80">
          <div className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{contactData.successModal.statusCrm}</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>{contactData.successModal.slaGuarantee}</span>
          </div>
        </div>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href={localeHomePath(locale)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-bold text-white outline-none transition-all hover:brightness-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {uiData.backToHome}
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 text-sm font-bold text-emerald-700 outline-none transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChatCircle size={16} />
            {contactData.successModal.whatsappCta}
          </a>
        </div>
      </motion.div>
      </section>
    </>
  );
}
