"use client";

import dynamic from "next/dynamic";
import { ClosingStatementFallback } from "@/components/sections/ClosingStatementFallback";
import { ContactSectionSkeleton } from "@/components/contact/ContactFormSkeleton";
import { useLocale } from "@/components/LocaleProvider";
import { LazyOnIdle, LazyOnVisible } from "@/components/ui/Lazy";
import { LOADING_LABEL } from "@/lib/loadingLabel";
import type { Locale } from "@/lib/i18n";

// Los dos son solo cliente (efecto de scroll, formulario), pero ninguno deja un hueco vacío mientras
// carga: el cierre muestra su texto con la misma altura y el contacto, un skeleton con la forma exacta
// del formulario. Así no hay salto de layout al hidratar y el texto del cierre sí está en el HTML.
function ContactLoading() {
  return <ContactSectionSkeleton label={LOADING_LABEL[useLocale()]} />;
}

const ClosingStatement = dynamic(
  () => import("@/components/sections/ClosingStatement").then((mod) => mod.ClosingStatement),
  { ssr: false, loading: () => <ClosingStatementFallback /> }
);
const Contact = dynamic(
  () => import("@/components/sections/Contact").then((mod) => mod.Contact),
  { ssr: false, loading: () => <ContactLoading /> }
);

// Las dos van bajo el primer pliegue: su chunk (formulario, efecto de scroll) solo se pide cuando la
// sección está por entrar en pantalla (`LazyOnVisible`); hasta entonces se ve el mismo fallback que
// ya trae el HTML, con la misma altura, así que no hay salto de layout.

export function HomeInteractiveClosing({ locale }: { locale: Locale }) {
  return (
    <LazyOnVisible fallback={<ClosingStatementFallback />}>
      <ClosingStatement locale={locale} />
    </LazyOnVisible>
  );
}

export function HomeInteractiveContact({ locale }: { locale: Locale }) {
  return (
    <LazyOnVisible fallback={<ContactLoading />}>
      <Contact locale={locale} />
    </LazyOnVisible>
  );
}

const SectionRail = dynamic(() => import("@/components/ui/SectionRail").then((mod) => mod.SectionRail), { ssr: false });

/** Indicador lateral de la home: solo `xl`, cuando el navegador está ocioso y sin descargarlo en móvil. */
export function HomeSectionRail({ locale }: { locale: Locale }) {
  return (
    <LazyOnIdle minWidth={1280}>
      <SectionRail locale={locale} />
    </LazyOnIdle>
  );
}
